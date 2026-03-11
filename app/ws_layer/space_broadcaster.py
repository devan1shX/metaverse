import asyncio
import os
from fastapi import WebSocket, WebSocketDisconnect
from logger import logger 
import json
import uuid
from uuid import UUID
from datetime import datetime
from typing import Dict, Any, Optional, List

space_broadcaster_manager = {} # space_id => space_broadcaster
user_ws_mapping = {} # user id - > websocket 
from db_layer import get_users_in_space , get_user_spaces, get_user_by_id, get_space_by_id, get_whiteboard_state, save_whiteboard_state
from chat import ChatManager
from media import MediaManager
from latency import elapsed_ms, perf_now, record_duration

WS_TEST_MODE = os.getenv("WS_TEST_MODE", "0").strip().lower() in {"1", "true", "yes", "on"}

# FIX 2: Create a JSON encoder that can handle UUIDs and datetime
class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            # if the obj is uuid, we simply return the value as string
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# FIX 2: Helper to convert asyncpg.Record to dict and clean data
def record_to_dict(record):
    if record is None:
        return None
    
    data = dict(record)
    clean_data = {}
    for key, value in data.items():
        clean_key = str(key)
        clean_value = value
        
        if isinstance(value, UUID):
            clean_value = str(value)
        elif isinstance(value, datetime):
            clean_value = value.isoformat()
        
        clean_data[clean_key] = clean_value
    return clean_data

class space_broadcaster:
    def __init__(self , space_id:str ):
        self.space_id= space_id 
        self.space_updates = asyncio.Queue()
        self.users: Dict[str, Any] = {} # {user_id: user_data_dict}
        self._running = True
        self.position_map = {} # userid -> {x , y}
        self.map_id: Optional[str] = None  # FIX: Store the space's map_id
        self.subscribers: List[WebSocket] = []
        self.parser_tasks: Dict[WebSocket, asyncio.Task] = {} # ws -> task mapping
        
        # Code Editor Session State
        self.active_code_session = {
            "code": "",
            "language": "javascript"
        }

        # Whiteboard Session State
        self.whiteboard_state: str = "[]"  # JSON string of Excalidraw elements
        self._whiteboard_save_task: Optional[asyncio.Task] = None  # debounce task
        
        # Main broadcast loop task
        self.broadcast_task: Optional[asyncio.Task] = None
        
        # Sub-managers
        self.chat_manager = ChatManager(self)
        self.media_manager = MediaManager(self)

        # ─── Interview Rooms State ─────────────────────────────────────────────
        # Set on first join — the user_id of the original space creator
        self.interviewer_id: Optional[str] = None
        # Candidates waiting to be admitted: {user_id: {user_name, user_avatar_url, joined_waiting_at}}
        self.waiting_room: Dict[str, Any] = {}
        # Timer state — tracked in server so late joiners get correct remaining time
        self.interview_timer: Dict[str, Any] = {
            "active": False,
            "duration_seconds": 0,
            "started_at": None,  # epoch float
            "extended_by": 0,    # total seconds added via extensions
        }
        # ──────────────────────────────────────────────────────────────────────
        
        space_broadcaster_manager[space_id] = self

    def enqueue_update(self, update: Dict[str, Any], source_event: Optional[str] = None) -> None:
        """Queue updates with internal latency metadata for queue/broadcast profiling."""
        event_tag = source_event or update.get("event") or "unknown"
        update["_latency_event"] = str(event_tag)
        update["_latency_queue_start"] = perf_now()
        self.space_updates.put_nowait(update)

    async def async_enqueue_update(self, update: Dict[str, Any], source_event: Optional[str] = None) -> None:
        """Async variant for callers currently using await queue.put(...)"""
        event_tag = source_event or update.get("event") or "unknown"
        update["_latency_event"] = str(event_tag)
        update["_latency_queue_start"] = perf_now()
        await self.space_updates.put(update)
    
    def add_subscriber(self , ws: WebSocket) -> asyncio.Task:
        if ws in self.subscribers:
            logger.warning(f"WebSocket already subscribed to space {self.space_id}")
            return self.parser_tasks[ws]
        
        self.subscribers.append(ws)
        logger.info(f"starting message parser for subscriber in space {self.space_id}")
        task = asyncio.create_task(self.message_parser(ws))
        self.parser_tasks[ws] = task
        return task

    async def init_data(self):
        try:
            # Load all users currently in the space from DB
            db_users = await get_users_in_space(self.space_id)
            for user_record in db_users:
                # FIX 2: Convert record to clean dict
                user = record_to_dict(user_record) 
                if user and 'id' in user:
                    user_id = user['id']
                    self.users[user_id] = user
                    if user_id not in self.position_map:
                        self.position_map[user_id] = {"x" : 0 , "y" : 0}
                else:
                    logger.warning(f"Found invalid user record in space {self.space_id}")
            # Load persisted whiteboard state
            self.whiteboard_state = await get_whiteboard_state(self.space_id)
            logger.info(f"Initialized space {self.space_id} with {len(self.users)} users. Whiteboard state loaded ({len(self.whiteboard_state)} chars).")
        except Exception as e:
            logger.error(f"Error in space_broadcaster init_data: {e}", exc_info=True)
    
    async def start_if_not_running(self):
        """Starts the main broadcast loop if it's not already running."""
        if self.broadcast_task is None or self.broadcast_task.done():
            logger.info(f"Starting broadcaster task for space {self.space_id}")
            await self.init_data() # Load initial data
            self._running = True
            self.broadcast_task = asyncio.create_task(self.start())
            await self.chat_manager.initialize()
            
    async def message_parser(self , ws:WebSocket):
        global user_ws_mapping  # Declare global at the top of the method
        user_id = None # Track which user this websocket belongs to
        try:
            while True:
                try:
                    data = await ws.receive_text()
                except RuntimeError:
                    logger.info(f"WebSocket connection closed for space {self.space_id}")
                    break

                parse_start = perf_now()
                try:
                    message = json.loads(data)
                except json.JSONDecodeError:
                    record_duration("unknown", "receive_to_parse", elapsed_ms(parse_start), space_id=self.space_id)
                    await ws.send_text(json.dumps({"event": "error", "message": "Invalid JSON payload"}))
                    continue

                event = message.get("event", None)
                if not event:
                    record_duration("unknown", "receive_to_parse", elapsed_ms(parse_start), space_id=self.space_id)
                    await ws.send_text(json.dumps({"event": "error", "message": "Invalid message, 'event' field is required"}))
                    continue

                event_lower = event.lower()
                record_duration(event_lower, "receive_to_parse", elapsed_ms(parse_start), space_id=self.space_id)
                handle_start = perf_now()

                try:
                    # --- Join Event (First event must be this) ---
                    if event_lower == "join":
                        user_id = message.get("user_id")
                        space_id = message.get("space_id")
                        if not user_id or not space_id:
                            await ws.send_text(json.dumps({"event": "error", "message": "Invalid join message"}))
                            continue

                        if space_id != self.space_id:
                            await ws.send_text(json.dumps({"event": "error", "message": "Mismatched space_id"}))
                            await ws.close()
                            return

                        user_ws_mapping[user_id] = ws

                        user_record = await get_user_by_id(user_id)
                        if not user_record:
                            if WS_TEST_MODE:
                                user_record = {
                                    "id": user_id,
                                    "user_name": f"User-{str(user_id)[:8]}",
                                    "email": f"{str(user_id)[:8]}@example.test",
                                    "role": "participant",
                                    "user_designation": "tester",
                                    "user_avatar_url": "",
                                    "user_about": "",
                                    "user_is_active": True,
                                }
                            else:
                                await ws.send_text(json.dumps({"event": "error", "message": "User not found"}))
                                await ws.close()
                                return

                        # ── Load space metadata (map + interview config) ──────
                        space_data = None
                        if self.map_id is None or self.interviewer_id is None:
                            space_data = await get_space_by_id(space_id)
                            if space_data:
                                logger.info(f"Space data keys: {list(space_data.keys())}")
                                self.map_id = space_data.get('map_id') or space_data.get('mapid') or space_data.get('mapId') or 'office-01'
                                logger.info(f"✅ Space {space_id} loaded with map_id: {self.map_id}")
                                # Detect interviewer — creator of the space
                                creator_id = str(space_data.get('admin_user_id') or space_data.get('created_by') or '')
                                if creator_id and self.interviewer_id is None:
                                    self.interviewer_id = creator_id
                                    logger.info(f"Interview space {space_id}: interviewer set to {creator_id}")
                            else:
                                self.map_id = 'office-01'
                                logger.warning(f"Could not fetch space data for {space_id}, using default map")

                        # ── Determine interview role ─────────────────────────
                        is_interview_space = False
                        interview_role = None
                        if space_data is None:
                            space_data = await get_space_by_id(space_id)
                        if space_data:
                            space_type = space_data.get('space_type') or 'general'
                            is_interview_space = (space_type == 'interview')
                            if is_interview_space:
                                interview_role = 'INTERVIEWER' if str(user_id) == str(self.interviewer_id) else 'CANDIDATE'

                        user_data = record_to_dict(user_record)
                        user_data["in_code_session"] = False
                        if interview_role:
                            user_data["interview_role"] = interview_role

                        # ── Waiting room: candidates must wait for admission ─
                        if is_interview_space and interview_role == 'CANDIDATE':
                            import time as _time
                            self.waiting_room[user_id] = {
                                "user_id": user_id,
                                "user_name": user_data.get('user_name', 'Unknown'),
                                "user_avatar_url": user_data.get('user_avatar_url', ''),
                                "joined_waiting_at": _time.time(),
                            }
                            # Tell this candidate they are in waiting room
                            await ws.send_text(json.dumps({
                                "event": "waiting_room_status",
                                "status": "waiting",
                                "message": "Please wait. The interviewer will admit you shortly.",
                            }))
                            # Notify interviewer about new waiting candidate
                            interviewer_ws = user_ws_mapping.get(str(self.interviewer_id))
                            if interviewer_ws:
                                await interviewer_ws.send_text(json.dumps({
                                    "event": "candidate_waiting",
                                    "user_id": user_id,
                                    "user_name": user_data.get('user_name', 'Unknown'),
                                    "user_avatar_url": user_data.get('user_avatar_url', ''),
                                    "waiting_count": len(self.waiting_room),
                                }))
                            logger.info(f"Candidate {user_id} entered waiting room for space {space_id}")
                            # Store WS mapping so we can admit later
                            user_ws_mapping[user_id] = ws
                            continue  # Don't proceed to normal join flow

                        # ── Normal join (non-interview or interviewer) ────────
                        self.users[user_id] = user_data
                        self.position_map[user_id] = {"x": 0, "y": 0}

                        media_info = await self.media_manager.get_space_media_info(self.space_id)

                        # Current timer state so late-joiners sync correctly
                        import time as _time_now
                        timer_payload = dict(self.interview_timer)
                        if timer_payload["active"] and timer_payload["started_at"]:
                            elapsed = _time_now.time() - timer_payload["started_at"]
                            timer_payload["elapsed_seconds"] = int(elapsed)
                        else:
                            timer_payload["elapsed_seconds"] = 0

                        await ws.send_text(json.dumps({
                            "event": "space_state",
                            "space_id": self.space_id,
                            "map_id": self.map_id,
                            "users": self.users,
                            "positions": self.position_map,
                            "media_info": media_info,
                            "code_session": self.active_code_session,
                            "whiteboard_state": self.whiteboard_state,
                            # Interview additions
                            "interview_role": interview_role,
                            "is_interview_space": is_interview_space,
                            "interview_timer": timer_payload,
                            "waiting_room": list(self.waiting_room.values()) if interview_role == 'INTERVIEWER' else [],
                        }, cls=CustomEncoder))

                        self.enqueue_update({
                            "event": "user_joined",
                            "user_id": user_id,
                            "space_id": self.space_id,
                            "user_data": user_data,
                            "x": 0,
                            "y": 0,
                            "exclude_ws": ws,
                        }, source_event="join")

                    # --- Position Update Event ---
                    elif event_lower == "position_move":
                        userid = message.get("user_id")
                        spaceid = message.get("space_id")
                        nx = message.get("nx")
                        ny = message.get("ny")
                        direction = message.get("direction", "down")
                        is_moving = message.get("isMoving", False)
                        if not userid or not spaceid or nx is None or ny is None:
                            await ws.send_text(json.dumps({"event": "error", "message": "Invalid message"}))
                            continue
                        await ws.send_text(json.dumps({"event": "position_move_ack", "user_id": userid, "space_id": spaceid, "nx": nx, "ny": ny}))
                        self.position_map[userid] = {"x": nx, "y": ny}
                        self.enqueue_update({
                            "event": "position_update",
                            "user_id": userid,
                            "space_id": spaceid,
                            "nx": nx,
                            "ny": ny,
                            "direction": direction,
                            "isMoving": is_moving,
                        }, source_event="position_move")

                    # --- Chat Events ---
                    elif event_lower == "send_chat_message":
                        message_data = message.get("data", {})
                        message_data["space_id"] = self.space_id
                        message_data["sender_id"] = user_id
                        if WS_TEST_MODE:
                            sender_name = "Unknown"
                            if user_id in self.users:
                                sender_name = self.users[user_id].get("user_name", "Unknown")
                            self.enqueue_update({
                                "event": "CHAT_MESSAGE",
                                "message_id": str(uuid.uuid4()),
                                "user_id": user_id,
                                "user_name": sender_name,
                                "message": message_data.get("content", ""),
                                "timestamp": asyncio.get_event_loop().time(),
                            }, source_event="send_chat_message")
                        else:
                            success, result = await self.chat_manager.handle_space_message(message_data)
                            if not success:
                                await ws.send_text(json.dumps({"event": "error", "message": result}))

                    elif event_lower == "send_private_message":
                        message_data = message.get("data", {})
                        message_data["sender_id"] = user_id
                        if WS_TEST_MODE:
                            receiver_id = message_data.get("receiver_id")
                            receiver_ws = user_ws_mapping.get(receiver_id)
                            if receiver_ws:
                                await receiver_ws.send_text(json.dumps({
                                    "event": "PRIVATE_MESSAGE",
                                    "from_user_id": user_id,
                                    "message": message_data.get("content", ""),
                                }))
                        else:
                            success, result = await self.chat_manager.handle_private_message(message_data)
                            if not success:
                                await ws.send_text(json.dumps({"event": "error", "message": result}))

                    # --- Code Editor Events ---
                    elif event_lower == "code_update":
                        new_code = message.get("code", "")
                        new_lang = message.get("language", "javascript")
                        target_user_ids = message.get("target_user_ids", [])

                        self.active_code_session["code"] = new_code
                        self.active_code_session["language"] = new_lang

                        target_ws_list = []
                        if target_user_ids:
                            for tid in target_user_ids:
                                if tid in user_ws_mapping:
                                    target_ws_list.append(user_ws_mapping[tid])

                        self.enqueue_update({
                            "event": "code_update",
                            "code": new_code,
                            "language": new_lang,
                            "user_id": user_id,
                            "exclude_ws": ws,
                            "target_ws_list": target_ws_list if target_user_ids else None
                        }, source_event="code_update")

                    elif event_lower == "code_execution_result":
                        output = message.get("output", "")
                        error = message.get("error", "")
                        target_user_ids = message.get("target_user_ids", [])

                        target_ws_list = []
                        if target_user_ids:
                            for tid in target_user_ids:
                                if tid in user_ws_mapping:
                                    target_ws_list.append(user_ws_mapping[tid])

                        self.enqueue_update({
                            "event": "code_execution_result",
                            "output": output,
                            "error": error,
                            "exclude_ws": ws,
                            "target_ws_list": target_ws_list if target_user_ids else None
                        }, source_event="code_execution_result")

                    elif event_lower == "send_code_invite":
                        target_user_ids = message.get("target_user_ids", [])
                        host_name = message.get("host_name", "Someone")

                        target_ws_list = []
                        if target_user_ids:
                            for tid in target_user_ids:
                                if tid in user_ws_mapping:
                                    target_ws_list.append(user_ws_mapping[tid])

                        if target_ws_list:
                            self.enqueue_update({
                                "event": "receive_code_invite",
                                "host_id": user_id,
                                "host_name": host_name,
                                "target_ws_list": target_ws_list
                            }, source_event="send_code_invite")

                    elif event_lower == "code_invite_response":
                        host_id = message.get("host_id")
                        accepted = message.get("accepted", False)
                        responder_name = message.get("responder_name", "A user")
                        reason = message.get("reason", "")

                        if host_id and host_id in user_ws_mapping:
                            host_ws = user_ws_mapping[host_id]
                            self.enqueue_update({
                                "event": "receive_code_invite_response",
                                "responder_id": user_id,
                                "responder_name": responder_name,
                                "accepted": accepted,
                                "reason": reason,
                                "target_ws_list": [host_ws]
                            }, source_event="code_invite_response")

                    elif event_lower == "code_session_status":
                        in_session = message.get("in_session", False)
                        if user_id in self.users:
                            self.users[user_id]["in_code_session"] = in_session

                        self.enqueue_update({
                            "event": "user_status_update",
                            "user_id": user_id,
                            "in_code_session": in_session
                        }, source_event="code_session_status")

                    # --- Whiteboard Events ---
                    elif event_lower == "whiteboard_update":
                        new_state = message.get("elements", "[]")
                        files = message.get("files", {})
                        target_user_ids = message.get("target_user_ids", [])

                        self.whiteboard_state = new_state

                        if self._whiteboard_save_task and not self._whiteboard_save_task.done():
                            self._whiteboard_save_task.cancel()
                        self._whiteboard_save_task = asyncio.create_task(
                            self._persist_whiteboard_delayed(new_state)
                        )

                        target_ws_list = None
                        if target_user_ids:
                            target_ws_list = []
                            for tid in target_user_ids:
                                if tid in user_ws_mapping:
                                    target_ws_list.append(user_ws_mapping[tid])

                        self.enqueue_update({
                            "event": "whiteboard_update",
                            "elements": new_state,
                            "files": files,
                            "user_id": user_id,
                            "exclude_ws": ws,
                            "target_ws_list": target_ws_list,
                        }, source_event="whiteboard_update")

                    elif event_lower == "whiteboard_clear":
                        target_user_ids = message.get("target_user_ids", [])
                        self.whiteboard_state = "[]"

                        asyncio.create_task(save_whiteboard_state(self.space_id, "[]"))

                        target_ws_list = None
                        if target_user_ids:
                            target_ws_list = []
                            for tid in target_user_ids:
                                if tid in user_ws_mapping:
                                    target_ws_list.append(user_ws_mapping[tid])

                        self.enqueue_update({
                            "event": "whiteboard_clear",
                            "user_id": user_id,
                            "target_ws_list": target_ws_list,
                        }, source_event="whiteboard_clear")

                    elif event_lower == "send_whiteboard_invite":
                        target_user_ids = message.get("target_user_ids", [])
                        host_name = message.get("host_name", "Someone")

                        target_ws_list = []
                        for tid in target_user_ids:
                            if tid in user_ws_mapping:
                                target_ws_list.append(user_ws_mapping[tid])

                        if target_ws_list:
                            self.enqueue_update({
                                "event": "receive_whiteboard_invite",
                                "host_id": user_id,
                                "host_name": host_name,
                                "target_ws_list": target_ws_list,
                            }, source_event="send_whiteboard_invite")

                    elif event_lower == "whiteboard_invite_response":
                        host_id = message.get("host_id")
                        accepted = message.get("accepted", False)
                        responder_name = message.get("responder_name", "A user")
                        reason = message.get("reason", "")

                        if host_id and host_id in user_ws_mapping:
                            host_ws = user_ws_mapping[host_id]
                            self.enqueue_update({
                                "event": "receive_whiteboard_invite_response",
                                "responder_id": user_id,
                                "responder_name": responder_name,
                                "accepted": accepted,
                                "reason": reason,
                                "target_ws_list": [host_ws],
                            }, source_event="whiteboard_invite_response")

                    elif event_lower == "whiteboard_session_status":
                        in_session = message.get("in_session", False)
                        if user_id in self.users:
                            self.users[user_id]["in_whiteboard_session"] = in_session

                        self.enqueue_update({
                            "event": "whiteboard_status_update",
                            "user_id": user_id,
                            "in_whiteboard_session": in_session,
                        }, source_event="whiteboard_session_status")

                    # ══════════════════════════════════════════════════════════
                    # ─── INTERVIEW ROOM EVENTS ─────────────────────────────
                    # ══════════════════════════════════════════════════════════

                    # ── Admit candidate from waiting room ─────────────────
                    elif event_lower == "admit_candidate":
                        if str(user_id) != str(self.interviewer_id):
                            await ws.send_text(json.dumps({"event": "error", "message": "Only the interviewer can admit candidates"}))
                            continue
                        candidate_id = message.get("candidate_id")
                        if not candidate_id or candidate_id not in self.waiting_room:
                            await ws.send_text(json.dumps({"event": "error", "message": "Candidate not in waiting room"}))
                            continue
                        candidate_info = self.waiting_room.pop(candidate_id)
                        candidate_ws = user_ws_mapping.get(candidate_id)
                        if candidate_ws:
                            # Tell candidate they are admitted
                            await candidate_ws.send_text(json.dumps({
                                "event": "waiting_room_status",
                                "status": "admitted",
                                "message": "You have been admitted to the interview.",
                            }))
                            # Now complete their join flow
                            candidate_data = self.users.get(candidate_id) or {
                                "id": candidate_id,
                                "user_name": candidate_info.get('user_name', 'Candidate'),
                                "user_avatar_url": candidate_info.get('user_avatar_url', ''),
                                "interview_role": "CANDIDATE",
                                "in_code_session": False,
                            }
                            candidate_data["interview_role"] = "CANDIDATE"
                            self.users[candidate_id] = candidate_data
                            self.position_map[candidate_id] = {"x": 0, "y": 0}
                            import time as _t_admit
                            timer_payload = dict(self.interview_timer)
                            timer_payload["elapsed_seconds"] = int(_t_admit.time() - timer_payload["started_at"]) if timer_payload["active"] and timer_payload["started_at"] else 0
                            media_info = await self.media_manager.get_space_media_info(self.space_id)
                            await candidate_ws.send_text(json.dumps({
                                "event": "space_state",
                                "space_id": self.space_id,
                                "map_id": self.map_id,
                                "users": self.users,
                                "positions": self.position_map,
                                "media_info": media_info,
                                "code_session": self.active_code_session,
                                "whiteboard_state": self.whiteboard_state,
                                "interview_role": "CANDIDATE",
                                "is_interview_space": True,
                                "interview_timer": timer_payload,
                                "waiting_room": [],
                            }, cls=CustomEncoder))
                            # Broadcast to everyone that candidate joined
                            self.enqueue_update({
                                "event": "user_joined",
                                "user_id": candidate_id,
                                "space_id": self.space_id,
                                "user_data": candidate_data,
                                "x": 0,
                                "y": 0,
                                "exclude_ws": candidate_ws,
                            }, source_event="admit_candidate")
                        logger.info(f"Candidate {candidate_id} admitted to interview space {self.space_id}")

                    # ── Reject / remove candidate from waiting room ────────
                    elif event_lower == "reject_candidate":
                        if str(user_id) != str(self.interviewer_id):
                            await ws.send_text(json.dumps({"event": "error", "message": "Only the interviewer can reject candidates"}))
                            continue
                        candidate_id = message.get("candidate_id")
                        if candidate_id in self.waiting_room:
                            self.waiting_room.pop(candidate_id)
                        candidate_ws = user_ws_mapping.get(candidate_id)
                        if candidate_ws:
                            await candidate_ws.send_text(json.dumps({
                                "event": "waiting_room_status",
                                "status": "rejected",
                                "message": "You were not admitted to this interview session.",
                            }))

                    # ── Interview Timer: Start ─────────────────────────────
                    elif event_lower == "interview_timer_start":
                        if str(user_id) != str(self.interviewer_id):
                            await ws.send_text(json.dumps({"event": "error", "message": "Only the interviewer can control the timer"}))
                            continue
                        import time as _t
                        duration = int(message.get("duration_seconds", 2700))  # default 45 min
                        self.interview_timer = {
                            "active": True,
                            "duration_seconds": duration,
                            "started_at": _t.time(),
                            "extended_by": 0,
                        }
                        self.enqueue_update({
                            "event": "INTERVIEW_TIMER_STARTED",
                            "duration_seconds": duration,
                            "started_at": self.interview_timer["started_at"],
                        }, source_event="interview_timer_start")
                        logger.info(f"Interview timer started for space {self.space_id}: {duration}s")

                    # ── Interview Timer: Extend ────────────────────────────
                    elif event_lower == "interview_timer_extend":
                        if str(user_id) != str(self.interviewer_id):
                            await ws.send_text(json.dumps({"event": "error", "message": "Only the interviewer can extend the timer"}))
                            continue
                        extra_seconds = int(message.get("extra_seconds", 600))  # default +10 min
                        self.interview_timer["duration_seconds"] += extra_seconds
                        self.interview_timer["extended_by"] = self.interview_timer.get("extended_by", 0) + extra_seconds
                        self.enqueue_update({
                            "event": "INTERVIEW_TIMER_EXTENDED",
                            "extra_seconds": extra_seconds,
                            "new_duration_seconds": self.interview_timer["duration_seconds"],
                        }, source_event="interview_timer_extend")

                    # ── Interview Timer: Pause ─────────────────────────────
                    elif event_lower == "interview_timer_pause":
                        if str(user_id) != str(self.interviewer_id):
                            await ws.send_text(json.dumps({"event": "error", "message": "Only the interviewer can pause the timer"}))
                            continue
                        import time as _t_pause
                        if self.interview_timer["active"] and self.interview_timer["started_at"]:
                            elapsed = _t_pause.time() - self.interview_timer["started_at"]
                            remaining = max(0, self.interview_timer["duration_seconds"] - elapsed)
                            self.interview_timer["active"] = False
                            self.interview_timer["duration_seconds"] = int(remaining)
                            self.interview_timer["started_at"] = None
                        self.enqueue_update({
                            "event": "INTERVIEW_TIMER_PAUSED",
                            "remaining_seconds": self.interview_timer["duration_seconds"],
                        }, source_event="interview_timer_pause")

                    # ── Interview Session: End ─────────────────────────────
                    elif event_lower == "interview_session_end":
                        if str(user_id) != str(self.interviewer_id):
                            await ws.send_text(json.dumps({"event": "error", "message": "Only the interviewer can end the session"}))
                            continue
                        self.interview_timer["active"] = False
                        # Remove all candidates from room
                        self.waiting_room.clear()
                        self.enqueue_update({
                            "event": "INTERVIEW_SESSION_ENDED",
                            "ended_by": user_id,
                        }, source_event="interview_session_end")
                        logger.info(f"Interview session ended for space {self.space_id}")

                    # ── Anti-Cheat: Tab Switch Detected (from candidate) ───
                    elif event_lower == "tab_switch_event":
                        # Forward only to the interviewer
                        switch_type = message.get("switch_type", "tab_switch")  # tab_switch | blur
                        import time as _t_switch
                        interviewer_ws = user_ws_mapping.get(str(self.interviewer_id))
                        candidate_name = self.users.get(user_id, {}).get('user_name', 'Unknown')
                        if interviewer_ws:
                            await interviewer_ws.send_text(json.dumps({
                                "event": "TAB_SWITCH_DETECTED",
                                "candidate_id": user_id,
                                "candidate_name": candidate_name,
                                "switch_type": switch_type,
                                "timestamp": _t_switch.time(),
                            }))

                    # ── Webcam Snapshot (from candidate → interviewer only) ─
                    elif event_lower == "webcam_snapshot":
                        image_data = message.get("image", "")
                        import time as _t_snap
                        interviewer_ws = user_ws_mapping.get(str(self.interviewer_id))
                        candidate_name = self.users.get(user_id, {}).get('user_name', 'Unknown')
                        if interviewer_ws and image_data:
                            await interviewer_ws.send_text(json.dumps({
                                "event": "WEBCAM_SNAPSHOT",
                                "candidate_id": user_id,
                                "candidate_name": candidate_name,
                                "image": image_data,
                                "timestamp": _t_snap.time(),
                            }))

                    # ── Kick User (interviewer only) ───────────────────────
                    elif event_lower == "kick_user":
                        if str(user_id) != str(self.interviewer_id):
                            await ws.send_text(json.dumps({"event": "error", "message": "Only the interviewer can kick users"}))
                            continue
                        target_id = message.get("target_user_id")
                        reason = message.get("reason", "Removed by interviewer")
                        target_ws = user_ws_mapping.get(target_id)
                        if target_ws:
                            await target_ws.send_text(json.dumps({
                                "event": "YOU_WERE_KICKED",
                                "reason": reason,
                            }))
                        # Clean up user from space state
                        if target_id in self.users:
                            del self.users[target_id]
                        if target_id in self.position_map:
                            del self.position_map[target_id]
                        if target_id in user_ws_mapping:
                            del user_ws_mapping[target_id]
                        self.waiting_room.pop(target_id, None)
                        self.enqueue_update({
                            "event": "user_left",
                            "user_id": target_id,
                            "space_id": self.space_id,
                        }, source_event="kick_user")
                        logger.info(f"User {target_id} kicked from interview space {self.space_id}")

                    elif event_lower == "webrtc_signal":
                        signal_type = message.get("signal_type")
                        to_user_id = message.get("to_user_id")
                        signal_data = message.get("data", {})

                        logger.info(f"WebRTC signal: {signal_type} from {user_id} to {to_user_id}")

                        if signal_type and to_user_id:
                            success, result = await self.media_manager.handle_webrtc_signal(
                                signal_type=signal_type,
                                from_user_id=user_id,
                                to_user_id=to_user_id,
                                space_id=self.space_id,
                                signal_data=signal_data
                            )
                            if not success:
                                logger.error(f"WebRTC signal failed: {result}")
                        else:
                            logger.error(f"Invalid WebRTC signal: signal_type={signal_type}, to_user_id={to_user_id}")

                    # --- Media Stream Events ---
                    elif event_lower == "start_audio_stream":
                        await self.media_manager.start_audio_stream(
                            user_id=user_id,
                            space_id=self.space_id,
                            metadata=message.get("metadata")
                        )

                    elif event_lower == "stop_audio_stream":
                        await self.media_manager.stop_audio_stream(
                            user_id=user_id,
                            space_id=self.space_id
                        )

                    elif event_lower == "start_video_stream":
                        await self.media_manager.start_video_stream(
                            user_id=user_id,
                            space_id=self.space_id,
                            metadata=message.get("metadata")
                        )

                    elif event_lower == "stop_video_stream":
                        await self.media_manager.stop_video_stream(
                            user_id=user_id,
                            space_id=self.space_id
                        )

                    elif event_lower == "start_screen_stream":
                        await self.media_manager.start_screen_stream(
                            user_id=user_id,
                            space_id=self.space_id,
                            metadata=message.get("metadata")
                        )

                    elif event_lower == "stop_screen_stream":
                        await self.media_manager.stop_screen_stream(
                            user_id=user_id,
                            space_id=self.space_id
                        )

                    # --- Leave Event ---
                    elif event_lower == "left":
                        logger.info(f"User {user_id} is leaving space {self.space_id}")
                        await ws.close(code=1000, reason="User left")
                    else:
                        await ws.send_text(json.dumps({"event": "error", "message": f"Unsupported event: {event}"}))
                finally:
                    record_duration(event_lower, "handle", elapsed_ms(handle_start), space_id=self.space_id)

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected in message_parser for space {self.space_id}")
            user_id_to_remove = None
            for uid, w in user_ws_mapping.items():
                if w == ws:
                    user_id_to_remove = uid
                    break
            
            # Use the user_id captured from the 'join' event
            if user_id and user_id not in user_ws_mapping:
                 user_id_to_remove = user_id
            
            if user_id_to_remove:
                if user_id_to_remove in user_ws_mapping:
                    del user_ws_mapping[user_id_to_remove]
                
                if user_id_to_remove in self.users:
                    del self.users[user_id_to_remove]
                if user_id_to_remove in self.position_map:
                    del self.position_map[user_id_to_remove]
                
                # Notify all remaining users
                self.enqueue_update({
                    "event": "user_left", 
                    "user_id": user_id_to_remove, 
                    "space_id": self.space_id
                }, source_event="left")
                # Clean up media streams for this user
                await self.media_manager.cleanup_user_streams(user_id_to_remove)
            else:
                logger.warning(f"A websocket disconnected but could not find matching user_id.")
            

        except Exception as e:
            logger.error(f"Error in message_parser for space {self.space_id}: {e}", exc_info=True)
            # Don't break loop, just log error and continue
        
    async def start(self):
        try:
            while self._running:
                try:
                    update = await asyncio.wait_for(
                        self.space_updates.get(), 
                        timeout=1.0
                    )
                    if self._running and self.subscribers:
                        latency_event = update.pop("_latency_event", update.get("event", "unknown"))
                        queue_start = update.pop("_latency_queue_start", None)
                        if queue_start is not None:
                            record_duration(
                                latency_event,
                                "queue_wait",
                                elapsed_ms(queue_start),
                                space_id=self.space_id,
                            )

                        broadcast_start = perf_now()
                        disconnected = []
                        # Extract exclude_ws before encoding to JSON
                        exclude_ws = update.pop("exclude_ws", None)
                        target_ws_list = update.pop("target_ws_list", None) # New explicit targeting logic
                        
                        # FIX 2: Use the custom JSON encoder
                        update_json = json.dumps(update, cls=CustomEncoder)
                        recipients = 0

                        for subscriber in self.subscribers:
                            # Skip excluded websocket
                            if subscriber == exclude_ws:
                                continue
                                
                            # If target_ws_list is provided AND this subscriber is not in it, skip
                            if target_ws_list is not None and subscriber not in target_ws_list:
                                continue
                                
                            try:
                                await subscriber.send_text(update_json)
                                recipients += 1
                            except Exception as e:
                                logger.warning(f"Failed to send update to subscriber: {e}")
                                disconnected.append(subscriber)
                        
                        record_duration(
                            latency_event,
                            "broadcast",
                            elapsed_ms(broadcast_start),
                            space_id=self.space_id,
                            metadata={"recipients": recipients},
                        )

                        for ws in disconnected:
                            if ws in self.subscribers:
                                self.subscribers.remove(ws)
                except asyncio.TimeoutError:
                    continue
        except asyncio.CancelledError:
            logger.info(f"space_broadcaster task cancelled for space {self.space_id}")
            self._running = False # Ensure loop terminates
        except Exception as e: 
            logger.error(f"Error in space_broadcaster main loop: {e}", exc_info=True)
            self._running = False
    
    async def _persist_whiteboard_delayed(self, state_json: str):
        """Wait 2 seconds then persist whiteboard state to DB (debounce helper)."""
        try:
            await asyncio.sleep(2)
            await save_whiteboard_state(self.space_id, state_json)
            logger.debug(f"Whiteboard state persisted for space {self.space_id}")
        except asyncio.CancelledError:
            pass  # Superseded by a newer save task — normal debounce behaviour
        except Exception as e:
            logger.error(f"Error persisting whiteboard state: {e}")

    async def stop(self):
        self._running = False
        
        # Cancel the main broadcast task
        if self.broadcast_task and not self.broadcast_task.done():
            self.broadcast_task.cancel()
            try:
                await self.broadcast_task
            except asyncio.CancelledError:
                pass
        self.broadcast_task = None
        
        # Cancel all active parser tasks
        for ws, task in list(self.parser_tasks.items()):
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        self.parser_tasks.clear()
        self.subscribers.clear()
        
        # Clean up chat and media managers
        await self.chat_manager.cleanup()

        # Remove from global manager
        if self.space_id in space_broadcaster_manager:
            if space_broadcaster_manager[self.space_id] is self:
                del space_broadcaster_manager[self.space_id]
        logger.info(f"Stopped and cleaned up broadcaster for space {self.space_id}")


def get_space_broadcaster(space_id:str) -> space_broadcaster:
    """Factory function to get or create a space broadcaster."""
    if space_id in space_broadcaster_manager:
        return space_broadcaster_manager[space_id]
    
    logger.info(f"Creating new broadcaster for space {space_id}")
    sb = space_broadcaster(space_id)
    # space_broadcaster_manager[space_id] = sb # This is handled in __init__
    return sb
