"""
Event Types and Definitions for Metaverse WebSocket System
"""
from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass
import json

class SpaceEventType(Enum):
    """Events broadcast to all users in a space and space channel subscribers"""
    USER_JOINED = "USER_JOINED"
    USER_LEFT = "USER_LEFT"
    USER_MOVED = "USER_MOVED"
    USER_STATE_CHANGED = "USER_STATE_CHANGED"  # standing/sitting
    USER_INVITED = "USER_INVITED"
    USER_COUNT_CHANGED = "USER_COUNT_CHANGED"
    CHAT_MESSAGE = "CHAT_MESSAGE"
    VIDEO_TOGGLED = "VIDEO_TOGGLED"
    AUDIO_TOGGLED = "AUDIO_TOGGLED"
    USER_ACTION = "USER_ACTION"
    SPACE_UPDATED = "SPACE_UPDATED"

class UserEventType(Enum):
    """Events sent to individual users privately"""
    NOTIFICATION_RECEIVED = "NOTIFICATION_RECEIVED"
    PRIVATE_MESSAGE = "PRIVATE_MESSAGE"
    INVITE_RECEIVED = "INVITE_RECEIVED"
    SPACE_INVITE_ACCEPTED = "SPACE_INVITE_ACCEPTED"
    SPACE_INVITE_DECLINED = "SPACE_INVITE_DECLINED"
    USER_PROFILE_UPDATED = "USER_PROFILE_UPDATED"
    CONNECTION_STATUS = "CONNECTION_STATUS"
    ERROR = "ERROR"

class UserState(Enum):
    """Physical states a user can be in"""
    STANDING = "standing"
    SITTING = "sitting"

@dataclass
class SpaceEvent:
    event_type: SpaceEventType
    space_id: str
    payload: Dict[str, Any]
    timestamp: Optional[float] = None
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event": self.event_type.value,
            "space_id": self.space_id,
            **self.payload,
            "timestamp": self.timestamp
        }
    def to_json(self) -> str:
        return json.dumps(self.to_dict())

@dataclass
class UserEvent:
    event_type: UserEventType
    user_id: str
    payload: Dict[str, Any]
    timestamp: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event": self.event_type.value,
            "user_id": self.user_id,
            **self.payload,
            "timestamp": self.timestamp
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict())


SPACE_EVENT_SCHEMAS = {
    SpaceEventType.USER_JOINED: {
        "user_id": "string",
        "user": {
            "id": "string",
            "user_name": "string",
            "user_avatar_url": "string",
            "user_designation": "string"
        },
        "position": {"x": "number", "y": "number", "z": "number"},
        "state": "string (standing/sitting)"
    },
    SpaceEventType.USER_LEFT: {
        "user_id": "string"
    },
    SpaceEventType.USER_MOVED: {
        "user_id": "string",
        "position": {"x": "number", "y": "number", "z": "number"}
    },
    SpaceEventType.USER_STATE_CHANGED: {
        "user_id": "string",
        "old_state": "string (standing/sitting)",
        "new_state": "string (standing/sitting)"
    },
    SpaceEventType.USER_INVITED: {
        "inviter_id": "string",
        "inviter_name": "string",
        "invitee_id": "string",
        "invitee_name": "string"
    },
    SpaceEventType.USER_COUNT_CHANGED: {
        "previous_count": "number",
        "current_count": "number",
        "change": "number (+1 or -1)"
    },
    SpaceEventType.CHAT_MESSAGE: {
        "user_id": "string",
        "user_name": "string",
        "message": "string",
        "message_id": "string (optional)"
    },
    SpaceEventType.VIDEO_TOGGLED: {
        "user_id": "string",
        "user_name": "string",
        "video_enabled": "boolean"
    },
    SpaceEventType.AUDIO_TOGGLED: {
        "user_id": "string",
        "user_name": "string",
        "audio_enabled": "boolean"
    }
}

USER_EVENT_SCHEMAS = {
    UserEventType.NOTIFICATION_RECEIVED: {
        "notification_id": "string",
        "title": "string",
        "message": "string",
        "type": "string",
        "data": "object (optional)"
    },
    UserEventType.PRIVATE_MESSAGE: {
        "from_user_id": "string",
        "from_user_name": "string",
        "message": "string",
        "message_id": "string"
    },
    UserEventType.INVITE_RECEIVED: {
        "invite_id": "string",
        "from_user_id": "string",
        "from_user_name": "string",
        "space_id": "string",
        "space_name": "string"
    }
}

