import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from logger import logger 
import json
import uuid
from uuid import UUID
from datetime import datetime
from typing import Dict, Any, Optional, List

space_broadcaster_manager = {} # space_id => space_broadcaster
user_ws_mapping = {} # user id - > websocket 
from db_layer import get_users_in_space , get_user_spaces, get_user_by_id, get_space_by_id
from chat import ChatManager
from media import MediaManager

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
        
        # Main broadcast loop task
        self.broadcast_task: Optional[asyncio.Task] = None
        
        # Sub-managers
        self.chat_manager = ChatManager(self)
        self.media_manager = MediaManager(self)
        
        space_broadcaster_manager[space_id] = self
    
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
            logger.info(f"Initialized space {self.space_id} with {len(self.users)} users.")
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
                except RuntimeError as e:
                    # WebSocket already closed - treat as disconnect
                    logger.info(f"WebSocket connection closed for space {self.space_id}")
                    break
                
                message = json.loads(data)
                event = message.get("event" , None)
                
                if not event:
                    await ws.send_text(json.dumps({"event": "error", "message": "Invalid message, 'event' field is required"}))
                    continue

                event_lower = event.lower()

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

                    user_ws_mapping[user_id] = ws # Add to global map for private messages
                    
                    user_record = await get_user_by_id(user_id)
                    if not user_record:
                        await ws.send_text(json.dumps({"event": "error", "message": "User not found"}))
                        await ws.close()
                        return
                    
                    # FIX: Fetch space data to get map_id (only once when first user joins)
                    if self.map_id is None:
                        space_data = await get_space_by_id(space_id)
                        if space_data:
                            # Log all space data keys to debug
                            logger.info(f"Space data keys: {list(space_data.keys())}")
                            logger.info(f"Space data map fields: map_id={space_data.get('map_id')}, mapid={space_data.get('mapid')}, mapId={space_data.get('mapId')}")
                            # Store the map_id from the space (could be 'map_id' or 'mapid' depending on DB schema)
                            self.map_id = space_data.get('map_id') or space_data.get('mapid') or space_data.get('mapId') or 'office-01'
                            logger.info(f"✅ Space {space_id} loaded with map_id: {self.map_id}")
                        else:
                            self.map_id = 'office-01'  # Default fallback
                            logger.warning(f"Could not fetch space data for {space_id}, using default map")
                    
                    # FIX 2: Convert record to clean dict
                    user_data = record_to_dict(user_record)
                    
                    self.users[user_id] = user_data # Add to this space's user dict
                    self.position_map[user_id] = {"x" : 0 , "y" : 0}
                    
                    # Get active media streams
                    media_info = await self.media_manager.get_space_media_info(self.space_id)

                    # Send current space state to the new user FIRST (including map_id)
                    # FIX 2: Use the custom JSON encoder
                    await ws.send_text(json.dumps({
                        "event": "space_state",
                        "space_id": self.space_id,
                        "map_id": self.map_id,  # FIX: Include map_id so all users load the same map
                        "users": self.users,
                        "positions": self.position_map,
                        "media_info": media_info # Include active media streams
                    }, cls=CustomEncoder))
                    
                    # Then notify all OTHER users (exclude the joining user)
                    self.space_updates.put_nowait({
                        "event": "user_joined", 
                        "user_id": user_id, 
                        "space_id": self.space_id, 
                        "user_data": user_data,
                        "x": 0, "y": 0,
                        "exclude_ws": ws  # Exclude the joining user's websocket
                    })

                # --- Position Update Event ---
                elif event_lower == "position_move":
                    userid = message.get("user_id")
                    spaceid = message.get("space_id")
                    nx = message.get("nx")
                    ny = message.get("ny")
                    direction = message.get("direction", "down")  # FIX: Extract direction for animations
                    isMoving = message.get("isMoving", False)  # FIX: Extract isMoving for animations
                    if not userid or not spaceid or nx is None or ny is None:
                        await ws.send_text(json.dumps({"event": "error", "message": "Invalid message"}))
                        continue
                    await ws.send_text(json.dumps({"event": "position_move_ack", "user_id": userid, "space_id": spaceid, "nx": nx, "ny": ny}))
                    self.position_map[userid] = {"x" : nx , "y" : ny}
                    # FIX: Include direction and isMoving in position updates for animation sync
                    self.space_updates.put_nowait({
                        "event": "position_update", 
                        "user_id": userid, 
                        "space_id": spaceid, 
                        "nx": nx, 
                        "ny": ny,
                        "direction": direction,
                        "isMoving": isMoving
                    })
                
                # --- Chat Events ---
                elif event_lower == "send_chat_message":
                    message_data = message.get("data", {})
                    message_data["space_id"] = self.space_id # Enforce space_id
                    message_data["sender_id"] = user_id # Enforce sender_id
                    success, result = await self.chat_manager.handle_space_message(message_data)
                    if not success:
                        await ws.send_text(json.dumps({"event": "error", "message": result}))
                        
                elif event_lower == "send_private_message":
                    message_data = message.get("data", {})
                    message_data["sender_id"] = user_id # Enforce sender_id
                    success, result = await self.chat_manager.handle_private_message(message_data)
                    if not success:
                        await ws.send_text(json.dumps({"event": "error", "message": result}))

                # --- WebRTC Signaling Event ---
                elif event_lower == "webrtc_signal":
                    # Frontend sends: { event, signal_type, to_user_id, space_id, data }
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
                    # This will trigger the WebSocketDisconnect exception
                    await ws.close(code=1000, reason="User left")

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
                self.space_updates.put_nowait({
                    "event": "user_left", 
                    "user_id": user_id_to_remove, 
                    "space_id": self.space_id
                })
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
                        disconnected = []
                        # Extract exclude_ws before encoding to JSON
                        exclude_ws = update.pop("exclude_ws", None)
                        # FIX 2: Use the custom JSON encoder
                        update_json = json.dumps(update, cls=CustomEncoder)
                        
                        for subscriber in self.subscribers:
                            # Skip excluded websocket
                            if subscriber == exclude_ws:
                                continue
                            try:
                                await subscriber.send_text(update_json)
                            except Exception as e:
                                logger.warning(f"Failed to send update to subscriber: {e}")
                                disconnected.append(subscriber)
                        
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
