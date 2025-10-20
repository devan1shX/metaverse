"""
WebSocket Layer Configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()

class WSConfig:
    """WebSocket Server Configuration"""
    
    # Server Settings
    WS_HOST = os.getenv('WS_HOST', 'localhost')
    WS_PORT = int(os.getenv('WS_PORT', 5001))
    
    # Event Types
    WS_EVENTS = {
        'JOIN_SPACE': 'JOIN_SPACE',
        'LEAVE_SPACE': 'LEAVE_SPACE',
        'MOVE': 'MOVE',
        'ACTION': 'ACTION',
        'CHAT': 'CHAT',
        'AUDIO': 'AUDIO',
        'VIDEO': 'VIDEO',
        'LEAVE': 'LEAVE',
        
        # Invite Events
        'SEND_INVITE': 'SEND_INVITE',
        'ACCEPT_INVITE': 'ACCEPT_INVITE',
        'DECLINE_INVITE': 'DECLINE_INVITE',
        'GET_USERS': 'GET_USERS',
        'GET_INVITES': 'GET_INVITES',
    }
    
    # Broadcast Events
    WS_BROADCAST_EVENTS = {
        'USER_JOINED': 'USER_JOINED',
        'USER_LEFT': 'USER_LEFT',
        'USER_MOVED': 'USER_MOVED',
        'USER_ACTION': 'USER_ACTION',
        'CHAT_MESSAGE': 'CHAT_MESSAGE',
        'INVITE_RECEIVED': 'INVITE_RECEIVED',
        'INVITE_ACCEPTED': 'INVITE_ACCEPTED',
        'INVITE_DECLINED': 'INVITE_DECLINED',
    }
    
    # Invite Settings
    INVITE_EXPIRY_HOURS = 24
    
    # User Roles
    USER_ROLES = {
        'ADMIN': 'admin',
        'PARTICIPANT': 'participant',
    }
    
    # Notification Types
    NOTIFICATION_TYPES = {
        'INVITE': 'invites',
        'UPDATE': 'updates',
    }
    
    @classmethod
    def get_event_types(cls):
        """Get all valid event types"""
        return list(cls.WS_EVENTS.values())
    
    @classmethod
    def is_valid_event(cls, event_type: str) -> bool:
        """Check if event type is valid"""
        return event_type in cls.WS_EVENTS.values()

