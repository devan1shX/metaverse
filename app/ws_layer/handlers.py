"""
WebSocket Message Handlers
"""
import logging
import json
from typing import Dict, Any, Optional
from .config import WSConfig
from .base import data_fetcher
from .invite import invite_manager

logger = logging.getLogger(__name__)

class MessageHandler:
    """Handles different types of WebSocket messages"""
    
    def __init__(self):
        self.config = WSConfig()
    
    async def handle_message(self, websocket, data: Dict[str, Any], conn_info) -> Optional[Dict[str, Any]]:
        """
        Route message to appropriate handler based on type
        
        Args:
            websocket: WebSocket connection
            data: Parsed message data
            conn_info: Connection information object
            
        Returns:
            Response dictionary or None
        """
        try:
            # Validate message has type field
            if 'type' not in data:
                return {
                    'status': 'failed',
                    'error': 'Message type is required'
                }
            
            message_type = data['type']
            
            # Validate message type
            if not self.config.is_valid_event(message_type):
                return {
                    'status': 'failed',
                    'error': f'Invalid message type: {message_type}'
                }
            
            # Route to appropriate handler
            handler_map = {
                'JOIN_SPACE': self.handle_join_space,
                'LEAVE_SPACE': self.handle_leave_space,
                'MOVE': self.handle_move,
                'ACTION': self.handle_action,
                'CHAT': self.handle_chat,
                'SEND_INVITE': self.handle_send_invite,
                'ACCEPT_INVITE': self.handle_accept_invite,
                'DECLINE_INVITE': self.handle_decline_invite,
                'GET_USERS': self.handle_get_users,
                'GET_INVITES': self.handle_get_invites,
            }
            
            handler = handler_map.get(message_type)
            if handler:
                return await handler(data, conn_info)
            else:
                logger.warning(f'No handler implemented for message type: {message_type}')
                return {
                    'status': 'failed',
                    'error': f'Handler not implemented for type: {message_type}'
                }
                
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            return {
                'status': 'failed',
                'error': 'Internal server error'
            }
    
    async def handle_join_space(self, data: Dict[str, Any], conn_info) -> Dict[str, Any]:
        """Handle JOIN_SPACE event"""
        try:
            # Validate payload
            if 'payload' not in data:
                return {'status': 'failed', 'error': 'Payload is required'}
            
            payload = data['payload']
            user_id = payload.get('userId')
            space_id = payload.get('spaceId')
            position = payload.get('initialPosition', {})
            
            if not user_id or not space_id:
                return {'status': 'failed', 'error': 'userId and spaceId are required'}
            
            # Validate user and space access
            user_data = await data_fetcher.fetch_user_data(user_id)
            if not user_data:
                return {'status': 'failed', 'error': 'User not found'}
            
            space_data = await data_fetcher.fetch_space_data(space_id)
            if not space_data:
                return {'status': 'failed', 'error': 'Space not found'}
            
            has_access = await data_fetcher.validate_user_space_access(user_id, space_id)
            if not has_access:
                return {'status': 'failed', 'error': 'Access denied to this space'}
            
            # Update connection info
            conn_info.user_id = user_id
            conn_info.space_id = space_id
            conn_info.is_authenticated = True
            
            logger.info(f"User {user_id} joined space {space_id}")
            
            return {
                'status': 'success',
                'message': 'Join space successful',
                'data': {
                    'user': user_data,
                    'space': space_data,
                    'position': position
                }
            }
            
        except Exception as e:
            logger.error(f"Error in handle_join_space: {e}")
            return {'status': 'failed', 'error': 'Failed to join space'}
    
    async def handle_leave_space(self, data: Dict[str, Any], conn_info) -> Dict[str, Any]:
        """Handle LEAVE_SPACE event"""
        try:
            if not conn_info or not conn_info.space_id:
                return {'status': 'failed', 'error': 'Not in any space'}
            
            space_id = conn_info.space_id
            user_id = conn_info.user_id
            
            # Clear connection info
            conn_info.space_id = None
            
            logger.info(f"User {user_id} left space {space_id}")
            
            return {
                'status': 'success',
                'message': 'Left space successfully',
                'data': {
                    'spaceId': space_id,
                    'userId': user_id
                }
            }
            
        except Exception as e:
            logger.error(f"Error in handle_leave_space: {e}")
            return {'status': 'failed', 'error': 'Failed to leave space'}
    
    async def handle_move(self, data: Dict[str, Any], conn_info) -> Dict[str, Any]:
        """Handle MOVE event"""
        try:
            if not conn_info or not conn_info.is_authenticated:
                return {'status': 'failed', 'error': 'Not authenticated'}
            
            payload = data.get('payload', {})
            position = payload.get('position', {})
            
            return {
                'status': 'success',
                'message': 'Move processed',
                'data': {
                    'userId': conn_info.user_id,
                    'spaceId': conn_info.space_id,
                    'position': position
                },
                'broadcast': True,
                'broadcastType': 'USER_MOVED'
            }
            
        except Exception as e:
            logger.error(f"Error in handle_move: {e}")
            return {'status': 'failed', 'error': 'Failed to process move'}
    
    async def handle_action(self, data: Dict[str, Any], conn_info) -> Dict[str, Any]:
        """Handle ACTION event"""
        try:
            if not conn_info or not conn_info.is_authenticated:
                return {'status': 'failed', 'error': 'Not authenticated'}
            
            payload = data.get('payload', {})
            action = payload.get('action')
            
            return {
                'status': 'success',
                'message': 'Action processed',
                'data': {
                    'userId': conn_info.user_id,
                    'spaceId': conn_info.space_id,
                    'action': action
                },
                'broadcast': True,
                'broadcastType': 'USER_ACTION'
            }
            
        except Exception as e:
            logger.error(f"Error in handle_action: {e}")
            return {'status': 'failed', 'error': 'Failed to process action'}
    
    async def handle_chat(self, data: Dict[str, Any], conn_info) -> Dict[str, Any]:
        """Handle CHAT event"""
        try:
            if not conn_info or not conn_info.is_authenticated:
                return {'status': 'failed', 'error': 'Not authenticated'}
            
            payload = data.get('payload', {})
            message = payload.get('message')
            
            if not message:
                return {'status': 'failed', 'error': 'Message is required'}
            
            return {
                'status': 'success',
                'message': 'Chat message sent',
                'data': {
                    'userId': conn_info.user_id,
                    'spaceId': conn_info.space_id,
                    'message': message
                },
                'broadcast': True,
                'broadcastType': 'CHAT_MESSAGE'
            }
            
        except Exception as e:
            logger.error(f"Error in handle_chat: {e}")
            return {'status': 'failed', 'error': 'Failed to send chat message'}
    
    async def handle_send_invite(self, data: Dict[str, Any], conn_info) -> Dict[str, Any]:
        """Handle SEND_INVITE event"""
        try:
            if not conn_info or not conn_info.is_authenticated:
                return {'status': 'failed', 'error': 'Not authenticated'}
            
            payload = data.get('payload', {})
            to_user_id = payload.get('toUserId')
            space_id = payload.get('spaceId')
            
            if not to_user_id or not space_id:
                return {'status': 'failed', 'error': 'toUserId and spaceId are required'}
            
            result = await invite_manager.send_invite(
                from_user_id=conn_info.user_id,
                to_user_id=to_user_id,
                space_id=space_id
            )
            
            if result['success']:
                return {
                    'status': 'success',
                    'message': result['message'],
                    'data': result.get('invite'),
                    'broadcast': True,
                    'broadcastType': 'INVITE_RECEIVED',
                    'broadcastTo': to_user_id
                }
            else:
                return {
                    'status': 'failed',
                    'error': result.get('error', 'Failed to send invite')
                }
                
        except Exception as e:
            logger.error(f"Error in handle_send_invite: {e}")
            return {'status': 'failed', 'error': 'Failed to send invite'}
    
    async def handle_accept_invite(self, data: Dict[str, Any], conn_info) -> Dict[str, Any]:
        """Handle ACCEPT_INVITE event"""
        try:
            if not conn_info or not conn_info.is_authenticated:
                return {'status': 'failed', 'error': 'Not authenticated'}
            
            payload = data.get('payload', {})
            notification_id = payload.get('notificationId')
            
            if not notification_id:
                return {'status': 'failed', 'error': 'notificationId is required'}
            
            result = await invite_manager.accept_invite(
                user_id=conn_info.user_id,
                notification_id=notification_id
            )
            
            if result['success']:
                return {
                    'status': 'success',
                    'message': result['message'],
                    'data': result.get('space')
                }
            else:
                return {
                    'status': 'failed',
                    'error': result.get('error', 'Failed to accept invite')
                }
                
        except Exception as e:
            logger.error(f"Error in handle_accept_invite: {e}")
            return {'status': 'failed', 'error': 'Failed to accept invite'}
    
    async def handle_decline_invite(self, data: Dict[str, Any], conn_info) -> Dict[str, Any]:
        """Handle DECLINE_INVITE event"""
        try:
            if not conn_info or not conn_info.is_authenticated:
                return {'status': 'failed', 'error': 'Not authenticated'}
            
            payload = data.get('payload', {})
            notification_id = payload.get('notificationId')
            
            if not notification_id:
                return {'status': 'failed', 'error': 'notificationId is required'}
            
            result = await invite_manager.decline_invite(
                user_id=conn_info.user_id,
                notification_id=notification_id
            )
            
            if result['success']:
                return {
                    'status': 'success',
                    'message': result['message']
                }
            else:
                return {
                    'status': 'failed',
                    'error': result.get('error', 'Failed to decline invite')
                }
                
        except Exception as e:
            logger.error(f"Error in handle_decline_invite: {e}")
            return {'status': 'failed', 'error': 'Failed to decline invite'}
    
    async def handle_get_users(self, data: Dict[str, Any], conn_info) -> Dict[str, Any]:
        """Handle GET_USERS event"""
        try:
            if not conn_info or not conn_info.is_authenticated:
                return {'status': 'failed', 'error': 'Not authenticated'}
            
            payload = data.get('payload', {})
            space_id = payload.get('spaceId')
            
            result = await invite_manager.get_all_users(
                requesting_user_id=conn_info.user_id,
                space_id=space_id
            )
            
            if result['success']:
                return {
                    'status': 'success',
                    'data': {
                        'users': result['users'],
                        'count': result['count']
                    }
                }
            else:
                return {
                    'status': 'failed',
                    'error': result.get('error', 'Failed to get users')
                }
                
        except Exception as e:
            logger.error(f"Error in handle_get_users: {e}")
            return {'status': 'failed', 'error': 'Failed to get users'}
    
    async def handle_get_invites(self, data: Dict[str, Any], conn_info) -> Dict[str, Any]:
        """Handle GET_INVITES event"""
        try:
            if not conn_info or not conn_info.is_authenticated:
                return {'status': 'failed', 'error': 'Not authenticated'}
            
            payload = data.get('payload', {})
            include_expired = payload.get('includeExpired', False)
            
            result = await invite_manager.get_user_invites(
                user_id=conn_info.user_id,
                include_expired=include_expired
            )
            
            if result['success']:
                return {
                    'status': 'success',
                    'data': {
                        'invites': result['invites'],
                        'count': result['count']
                    }
                }
            else:
                return {
                    'status': 'failed',
                    'error': result.get('error', 'Failed to get invites')
                }
                
        except Exception as e:
            logger.error(f"Error in handle_get_invites: {e}")
            return {'status': 'failed', 'error': 'Failed to get invites'}

