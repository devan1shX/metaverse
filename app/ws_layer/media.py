"""
Media Layer - Audio and Video Streaming System
Handles real-time audio/video streaming in spaces using WebRTC signaling over WebSocket
"""

import asyncio
import json
from typing import Dict, Any, Optional, List, Set
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime

from logger import logger

# (Enums and Dataclasses remain the same)
class MediaType(Enum):
    AUDIO = "audio"
    VIDEO = "video"
    SCREEN_SHARE = "screen"

class MediaState(Enum):
    ENABLED = "enabled"
    DISABLED = "disabled"
    MUTED = "muted"

class SignalType(Enum):
    OFFER = "offer"
    ANSWER = "answer"
    ICE_CANDIDATE = "ice_candidate"

@dataclass
class MediaStream:
    stream_id: str
    user_id: str
    space_id: str
    media_type: str
    state: str
    timestamp: float
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass
class WebRTCSignal:
    signal_type: str
    from_user_id: str
    to_user_id: str
    space_id: str
    data: Dict[str, Any]
    timestamp: float
    
    def to_dict(self) -> Dict:
        return asdict(self)


class MediaManager:
    """
    Manages media streams (audio/video) in spaces
    (ws_manager is the space_broadcaster)
    """
    
    def __init__(self, ws_manager: Any):
        self.ws_manager = ws_manager
        
        # Track active media streams
        self.active_audio_streams: Dict[str, Dict[str, MediaStream]] = {} # space_id -> {user_id: stream}
        self.active_video_streams: Dict[str, Dict[str, MediaStream]] = {} # space_id -> {user_id: stream}
        self.active_screen_shares: Dict[str, Dict[str, MediaStream]] = {} # space_id -> {user_id: stream}
        
        # Track user media state
        self.user_audio_state: Dict[str, str] = {} # user_id -> state
        self.user_video_state: Dict[str, str] = {} # user_id -> state
        self.user_screen_state: Dict[str, str] = {} # user_id -> state
        
        # WebRTC peer connections tracking
        self.peer_connections: Dict[str, Set[str]] = {} # user_id -> set of connected peer user_ids
        
        # Stats
        self.stats = {
            "total_audio_streams": 0,
            "total_video_streams": 0,
            "active_audio": 0,
            "active_video": 0,
            "webrtc_signals": 0
        }
        
        logger.info("MediaManager initialized")
    
    # ========================================
    # Audio Stream Management
    # ========================================
    
    async def start_audio_stream(
        self,
        user_id: str,
        space_id: str,
        metadata: Optional[Dict] = None
    ) -> tuple[bool, str]:
        """
        Start audio stream for a user in a space
        Returns: (success, stream_id or error)
        """
        try:
            # Verify user is in space (ws_manager is space_broadcaster)
            if user_id not in self.ws_manager.users:
                return False, "User not in space"
            
            # Check if already streaming
            if space_id in self.active_audio_streams:
                if user_id in self.active_audio_streams[space_id]:
                    return False, "Already streaming audio"
            
            # Create stream
            stream_id = f"audio_{user_id}_{space_id}_{int(asyncio.get_event_loop().time())}"
            stream = MediaStream(
                stream_id=stream_id,
                user_id=user_id,
                space_id=space_id,
                media_type=MediaType.AUDIO.value,
                state=MediaState.ENABLED.value,
                timestamp=asyncio.get_event_loop().time(),
                metadata=metadata or {}
            )
            
            # Store stream
            if space_id not in self.active_audio_streams:
                self.active_audio_streams[space_id] = {}
            self.active_audio_streams[space_id][user_id] = stream
            
            # Update user state
            self.user_audio_state[user_id] = MediaState.ENABLED.value
            
            # Get user info from broadcaster's state
            user = self.ws_manager.users.get(user_id)
            user_name = user.get('user_name', 'Unknown') if user else 'Unknown'
            
            # Broadcast to space via queue
            await self.ws_manager.space_updates.put({
                "event": "AUDIO_STREAM_STARTED",
                "user_id": user_id,
                "user_name": user_name,
                "space_id": space_id,
                "stream_id": stream_id,
                "timestamp": stream.timestamp
            })
            
            # Update stats
            self.stats["total_audio_streams"] += 1
            self.stats["active_audio"] = sum(len(streams) for streams in self.active_audio_streams.values())
            
            logger.info(f"Audio stream started: {stream_id} for user {user_id} in space {space_id}")
            return True, stream_id
            
        except Exception as e:
            logger.error(f"Error starting audio stream: {e}")
            return False, str(e)
    
    async def stop_audio_stream(self, user_id: str, space_id: str) -> tuple[bool, str]:
        """Stop audio stream"""
        try:
            if space_id not in self.active_audio_streams or user_id not in self.active_audio_streams[space_id]:
                return False, "User not streaming audio"
            
            stream = self.active_audio_streams[space_id][user_id]
            stream_id = stream.stream_id
            
            del self.active_audio_streams[space_id][user_id]
            if not self.active_audio_streams[space_id]:
                del self.active_audio_streams[space_id]
            
            self.user_audio_state[user_id] = MediaState.DISABLED.value
            
            user = self.ws_manager.users.get(user_id)
            user_name = user.get('user_name', 'Unknown') if user else 'Unknown'
            
            await self.ws_manager.space_updates.put({
                "event": "AUDIO_STREAM_STOPPED",
                "user_id": user_id,
                "user_name": user_name,
                "space_id": space_id,
                "stream_id": stream_id,
                "timestamp": asyncio.get_event_loop().time()
            })
            
            self.stats["active_audio"] = sum(len(streams) for streams in self.active_audio_streams.values())
            logger.info(f"Audio stream stopped: {stream_id}")
            return True, stream_id
            
        except Exception as e:
            logger.error(f"Error stopping audio stream: {e}")
            return False, str(e)
    
    async def mute_audio(self, user_id: str, space_id: str) -> tuple[bool, str]:
        """Mute audio stream"""
        try:
            if space_id not in self.active_audio_streams or user_id not in self.active_audio_streams[space_id]:
                return False, "User not streaming audio"
            
            stream = self.active_audio_streams[space_id][user_id]
            stream.state = MediaState.MUTED.value
            self.user_audio_state[user_id] = MediaState.MUTED.value
            
            user = self.ws_manager.users.get(user_id)
            user_name = user.get('user_name', 'Unknown') if user else 'Unknown'
            
            await self.ws_manager.space_updates.put({
                "event": "AUDIO_MUTED",
                "user_id": user_id,
                "user_name": user_name,
                "space_id": space_id,
                "timestamp": asyncio.get_event_loop().time()
            })
            
            logger.info(f"Audio muted for user {user_id} in space {space_id}")
            return True, "Audio muted"
            
        except Exception as e:
            logger.error(f"Error muting audio: {e}")
            return False, str(e)
    
    async def unmute_audio(self, user_id: str, space_id: str) -> tuple[bool, str]:
        """Unmute audio stream"""
        try:
            if space_id not in self.active_audio_streams or user_id not in self.active_audio_streams[space_id]:
                return False, "User not streaming audio"
            
            stream = self.active_audio_streams[space_id][user_id]
            stream.state = MediaState.ENABLED.value
            self.user_audio_state[user_id] = MediaState.ENABLED.value
            
            user = self.ws_manager.users.get(user_id)
            user_name = user.get('user_name', 'Unknown') if user else 'Unknown'
            
            await self.ws_manager.space_updates.put({
                "event": "AUDIO_UNMUTED",
                "user_id": user_id,
                "user_name": user_name,
                "space_id": space_id,
                "timestamp": asyncio.get_event_loop().time()
            })
            
            logger.info(f"Audio unmuted for user {user_id} in space {space_id}")
            return True, "Audio unmuted"
            
        except Exception as e:
            logger.error(f"Error unmuting audio: {e}")
            return False, str(e)
    
    # ========================================
    # Video Stream Management (Similar fixes)
    # ========================================
    
    async def start_video_stream(
        self,
        user_id: str,
        space_id: str,
        metadata: Optional[Dict] = None
    ) -> tuple[bool, str]:
        """Start video stream for a user in a space"""
        try:
            if user_id not in self.ws_manager.users:
                return False, "User not in space"
            
            if space_id in self.active_video_streams and user_id in self.active_video_streams[space_id]:
                return False, "Already streaming video"
            
            stream_id = f"video_{user_id}_{space_id}_{int(asyncio.get_event_loop().time())}"
            stream = MediaStream(
                stream_id=stream_id,
                user_id=user_id,
                space_id=space_id,
                media_type=MediaType.VIDEO.value,
                state=MediaState.ENABLED.value,
                timestamp=asyncio.get_event_loop().time(),
                metadata=metadata or {}
            )
            
            if space_id not in self.active_video_streams:
                self.active_video_streams[space_id] = {}
            self.active_video_streams[space_id][user_id] = stream
            
            self.user_video_state[user_id] = MediaState.ENABLED.value
            
            user = self.ws_manager.users.get(user_id)
            user_name = user.get('user_name', 'Unknown') if user else 'Unknown'
            
            await self.ws_manager.space_updates.put({
                "event": "VIDEO_STREAM_STARTED",
                "user_id": user_id,
                "user_name": user_name,
                "space_id": space_id,
                "stream_id": stream_id,
                "timestamp": stream.timestamp
            })
            
            self.stats["total_video_streams"] += 1
            self.stats["active_video"] = sum(len(streams) for streams in self.active_video_streams.values())
            
            logger.info(f"Video stream started: {stream_id} for user {user_id} in space {space_id}")
            return True, stream_id
            
        except Exception as e:
            logger.error(f"Error starting video stream: {e}")
            return False, str(e)
    
    async def stop_video_stream(self, user_id: str, space_id: str) -> tuple[bool, str]:
        """Stop video stream"""
        try:
            if space_id not in self.active_video_streams or user_id not in self.active_video_streams[space_id]:
                return False, "User not streaming video"
            
            stream = self.active_video_streams[space_id][user_id]
            stream_id = stream.stream_id
            
            del self.active_video_streams[space_id][user_id]
            if not self.active_video_streams[space_id]:
                del self.active_video_streams[space_id]
            
            self.user_video_state[user_id] = MediaState.DISABLED.value
            
            user = self.ws_manager.users.get(user_id)
            user_name = user.get('user_name', 'Unknown') if user else 'Unknown'
            
            await self.ws_manager.space_updates.put({
                "event": "VIDEO_STREAM_STOPPED",
                "user_id": user_id,
                "user_name": user_name,
                "space_id": space_id,
                "stream_id": stream_id,
                "timestamp": asyncio.get_event_loop().time()
            })
            
            self.stats["active_video"] = sum(len(streams) for streams in self.active_video_streams.values())
            logger.info(f"Video stream stopped: {stream_id}")
            return True, stream_id
            
        except Exception as e:
            logger.error(f"Error stopping video stream: {e}")
            return False, str(e)
    
    # ========================================
    # WebRTC Signaling
    # ========================================
    
    async def handle_webrtc_signal(
        self,
        signal_type: str,
        from_user_id: str,
        to_user_id: str,
        space_id: str,
        signal_data: Dict
    ) -> tuple[bool, str]:
        """
        Handle WebRTC signaling (offer/answer/ICE candidates)
        Forwards signaling data directly between peers
        """
        try:
            # Verify both users are in the same space
            from_in_space = from_user_id in self.ws_manager.users
            to_in_space = to_user_id in self.ws_manager.users
            
            if not (from_in_space and to_in_space):
                return False, "Users not in same space"
            
            # Import global map
            from space_broadcaster import user_ws_mapping
            
            # Find the target user's websocket
            target_ws = user_ws_mapping.get(to_user_id)
            if not target_ws:
                return False, "Target user is not connected"
            
            # Track peer connection
            if from_user_id not in self.peer_connections:
                self.peer_connections[from_user_id] = set()
            self.peer_connections[from_user_id].add(to_user_id)
            
            # Forward signal directly to target user
            await target_ws.send_text(json.dumps({
                "event": "WEBRTC_SIGNAL",
                "signal_type": signal_type,
                "from_user_id": from_user_id,
                "space_id": space_id,
                "data": signal_data,
                "timestamp": asyncio.get_event_loop().time()
            }))
            
            self.stats["webrtc_signals"] += 1
            logger.debug(f"WebRTC signal {signal_type} from {from_user_id} to {to_user_id}")
            return True, "Signal sent"
            
        except Exception as e:
            logger.error(f"Error handling WebRTC signal: {e}")
            return False, str(e)
    
    # ========================================
    # Space Media Info
    # ========================================
    
    async def get_space_media_info(self, space_id: str) -> Dict:
        """Get all active media streams in a space"""
        try:
            audio_streams = []
            if space_id in self.active_audio_streams:
                for user_id, stream in self.active_audio_streams[space_id].items():
                    user = self.ws_manager.users.get(user_id) # Use local state
                    audio_streams.append({
                        "stream_id": stream.stream_id,
                        "user_id": user_id,
                        "user_name": user.get('user_name', 'Unknown') if user else 'Unknown',
                        "state": stream.state,
                        "timestamp": stream.timestamp
                    })
            
            video_streams = []
            if space_id in self.active_video_streams:
                for user_id, stream in self.active_video_streams[space_id].items():
                    user = self.ws_manager.users.get(user_id) # Use local state
                    video_streams.append({
                        "stream_id": stream.stream_id,
                        "user_id": user_id,
                        "user_name": user.get('user_name', 'Unknown') if user else 'Unknown',
                        "state": stream.state,
                        "timestamp": stream.timestamp
                    })
            
            return {
                "space_id": space_id,
                "audio_streams": audio_streams,
                "video_streams": video_streams,
                "total_audio": len(audio_streams),
                "total_video": len(video_streams)
            }
            
        except Exception as e:
            logger.error(f"Error getting space media info: {e}")
            return {"space_id": space_id, "audio_streams": [], "video_streams": [], "error": str(e)}
    
    # ========================================
    # Cleanup
    # ========================================
    
    async def cleanup_user_streams(self, user_id: str):
        """Clean up all streams for a user (on disconnect)"""
        try:
            # Clean up audio streams
            for space_id in list(self.active_audio_streams.keys()):
                if user_id in self.active_audio_streams[space_id]:
                    await self.stop_audio_stream(user_id, space_id)
            
            # Clean up video streams
            for space_id in list(self.active_video_streams.keys()):
                if user_id in self.active_video_streams[space_id]:
                    await self.stop_video_stream(user_id, space_id)
            
            # Clean up peer connections
            if user_id in self.peer_connections:
                del self.peer_connections[user_id]
            
            for peers in self.peer_connections.values():
                peers.discard(user_id)
            
            # Clean up user state
            self.user_audio_state.pop(user_id, None)
            self.user_video_state.pop(user_id, None)
            self.user_screen_state.pop(user_id, None)
            
            logger.info(f"Cleaned up media streams for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error cleaning up user streams: {e}")
    
    def get_stats(self) -> Dict:
        """Get media manager statistics"""
        return {
            **self.stats,
            "active_audio_spaces": len(self.active_audio_streams),
            "active_video_spaces": len(self.active_video_streams),
            "total_peer_connections": sum(len(peers) for peers in self.peer_connections.values())
        }

# Export
__all__ = [
    'MediaManager',
    'MediaStream',
    'MediaType',
    'MediaState',
    'WebRTCSignal',
    'SignalType'
]