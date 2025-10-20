"""
Invite Management System for WebSocket Layer
"""
import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Any
from .db_pylayer import db_manager
from .config import WSConfig

logger = logging.getLogger(__name__)

class InviteManager:
    """Manages space invitations"""
    
    def __init__(self):
        self.config = WSConfig()
    
    async def send_invite(self, from_user_id: str, to_user_id: str, space_id: str) -> Dict[str, Any]:
        """
        Send an invite from one user to another for a space
        
        Args:
            from_user_id: ID of user sending the invite
            to_user_id: ID of user receiving the invite
            space_id: ID of space being invited to
            
        Returns:
            Dict with success status and invite details
        """
        try:
            async with db_manager.get_connection() as conn:
                # Validate sender has access to the space
                space_query = """
                    SELECT s.id, s.name, s.admin_user_id, s.max_users, s.is_active,
                           (SELECT COUNT(*) FROM user_spaces WHERE space_id = s.id) as current_users
                    FROM spaces s
                    LEFT JOIN user_spaces us ON s.id = us.space_id AND us.user_id = $1
                    WHERE s.id = $2 AND s.is_active = true
                    AND (s.admin_user_id = $1 OR us.user_id IS NOT NULL)
                """
                space = await conn.fetchrow(space_query, from_user_id, space_id)
                
                if not space:
                    return {
                        'success': False,
                        'error': 'You do not have access to this space or space does not exist'
                    }
                
                # Check if space is full
                if space['current_users'] >= space['max_users']:
                    return {
                        'success': False,
                        'error': 'Space is full'
                    }
                
                # Validate recipient exists
                user_query = """
                    SELECT id, username, email 
                    FROM users 
                    WHERE id = $1 AND is_active = true
                """
                recipient = await conn.fetchrow(user_query, to_user_id)
                
                if not recipient:
                    return {
                        'success': False,
                        'error': 'Recipient user does not exist'
                    }
                
                # Check if recipient is already in the space
                existing_member_query = """
                    SELECT 1 FROM user_spaces 
                    WHERE user_id = $1 AND space_id = $2
                """
                existing_member = await conn.fetchrow(existing_member_query, to_user_id, space_id)
                
                if existing_member:
                    return {
                        'success': False,
                        'error': 'User is already a member of this space'
                    }
                
                # Check for existing pending invite
                existing_invite_query = """
                    SELECT id FROM notifications
                    WHERE user_id = $1 AND type = 'invites'
                    AND data->>'spaceId' = $2
                    AND status = 'unread'
                    AND is_active = true
                    AND (expires_at IS NULL OR expires_at > NOW())
                """
                existing_invite = await conn.fetchrow(
                    existing_invite_query, 
                    to_user_id, 
                    space_id
                )
                
                if existing_invite:
                    return {
                        'success': False,
                        'error': 'A pending invite already exists for this user and space'
                    }
                
                # Get sender info
                sender = await conn.fetchrow(user_query, from_user_id)
                
                # Create notification for the invite
                expires_at = datetime.utcnow() + timedelta(hours=self.config.INVITE_EXPIRY_HOURS)
                notification_id = str(uuid.uuid4())
                
                notification_query = """
                    INSERT INTO notifications 
                    (id, user_id, type, title, message, data, status, expires_at, is_active, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                    RETURNING id, title, message, created_at
                """
                
                invite_data = {
                    'spaceId': space_id,
                    'spaceName': space['name'],
                    'fromUserId': from_user_id,
                    'fromUsername': sender['username'],
                    'inviteType': 'space_invite'
                }
                
                notification = await conn.fetchrow(
                    notification_query,
                    notification_id,
                    to_user_id,
                    'invites',
                    f"Space Invite from {sender['username']}",
                    f"{sender['username']} has invited you to join the space '{space['name']}'",
                    invite_data,
                    'unread',
                    expires_at,
                    True
                )
                
                logger.info(f"Invite sent from {from_user_id} to {to_user_id} for space {space_id}")
                
                return {
                    'success': True,
                    'message': 'Invite sent successfully',
                    'invite': {
                        'id': notification_id,
                        'toUser': {
                            'id': to_user_id,
                            'username': recipient['username']
                        },
                        'fromUser': {
                            'id': from_user_id,
                            'username': sender['username']
                        },
                        'space': {
                            'id': space_id,
                            'name': space['name']
                        },
                        'expiresAt': expires_at.isoformat()
                    }
                }
                
        except Exception as e:
            logger.error(f"Error sending invite: {e}")
            return {
                'success': False,
                'error': 'Failed to send invite'
            }
    
    async def accept_invite(self, user_id: str, notification_id: str) -> Dict[str, Any]:
        """
        Accept a space invite
        
        Args:
            user_id: ID of user accepting the invite
            notification_id: ID of the notification/invite
            
        Returns:
            Dict with success status and details
        """
        try:
            async with db_manager.get_connection() as conn:
                # Start a transaction
                async with conn.transaction():
                    # Get and validate the invite
                    invite_query = """
                        SELECT id, user_id, data, expires_at, status
                        FROM notifications
                        WHERE id = $1 AND user_id = $2 AND type = 'invites'
                        AND is_active = true
                    """
                    invite = await conn.fetchrow(invite_query, notification_id, user_id)
                    
                    if not invite:
                        return {
                            'success': False,
                            'error': 'Invite not found'
                        }
                    
                    if invite['status'] != 'unread':
                        return {
                            'success': False,
                            'error': 'Invite has already been processed'
                        }
                    
                    # Check if expired
                    if invite['expires_at'] and invite['expires_at'] < datetime.utcnow():
                        await conn.execute(
                            "UPDATE notifications SET status = 'dismissed', updated_at = NOW() WHERE id = $1",
                            notification_id
                        )
                        return {
                            'success': False,
                            'error': 'Invite has expired'
                        }
                    
                    invite_data = invite['data']
                    space_id = invite_data.get('spaceId')
                    
                    if not space_id:
                        return {
                            'success': False,
                            'error': 'Invalid invite data'
                        }
                    
                    # Validate space still exists and is active
                    space_query = """
                        SELECT id, name, max_users,
                               (SELECT COUNT(*) FROM user_spaces WHERE space_id = $1) as current_users
                        FROM spaces
                        WHERE id = $1 AND is_active = true
                    """
                    space = await conn.fetchrow(space_query, space_id)
                    
                    if not space:
                        return {
                            'success': False,
                            'error': 'Space no longer exists or is inactive'
                        }
                    
                    # Check if space is full
                    if space['current_users'] >= space['max_users']:
                        return {
                            'success': False,
                            'error': 'Space is now full'
                        }
                    
                    # Check if user is already a member
                    existing_member = await conn.fetchrow(
                        "SELECT 1 FROM user_spaces WHERE user_id = $1 AND space_id = $2",
                        user_id, space_id
                    )
                    
                    if existing_member:
                        # Update notification to read
                        await conn.execute(
                            "UPDATE notifications SET status = 'read', updated_at = NOW() WHERE id = $1",
                            notification_id
                        )
                        return {
                            'success': True,
                            'message': 'You are already a member of this space',
                            'space': {
                                'id': space_id,
                                'name': space['name']
                            }
                        }
                    
                    # Add user to space
                    join_query = """
                        INSERT INTO user_spaces (user_id, space_id, joined_at)
                        VALUES ($1, $2, NOW())
                        ON CONFLICT (user_id, space_id) DO NOTHING
                    """
                    await conn.execute(join_query, user_id, space_id)
                    
                    # Update notification status
                    await conn.execute(
                        "UPDATE notifications SET status = 'read', updated_at = NOW() WHERE id = $1",
                        notification_id
                    )
                    
                    logger.info(f"User {user_id} accepted invite and joined space {space_id}")
                    
                    return {
                        'success': True,
                        'message': 'Invite accepted successfully',
                        'space': {
                            'id': space_id,
                            'name': space['name']
                        }
                    }
                    
        except Exception as e:
            logger.error(f"Error accepting invite: {e}")
            return {
                'success': False,
                'error': 'Failed to accept invite'
            }
    
    async def decline_invite(self, user_id: str, notification_id: str) -> Dict[str, Any]:
        """
        Decline a space invite
        
        Args:
            user_id: ID of user declining the invite
            notification_id: ID of the notification/invite
            
        Returns:
            Dict with success status
        """
        try:
            async with db_manager.get_connection() as conn:
                # Get and validate the invite
                invite_query = """
                    SELECT id, user_id, status, data
                    FROM notifications
                    WHERE id = $1 AND user_id = $2 AND type = 'invites'
                    AND is_active = true
                """
                invite = await conn.fetchrow(invite_query, notification_id, user_id)
                
                if not invite:
                    return {
                        'success': False,
                        'error': 'Invite not found'
                    }
                
                if invite['status'] != 'unread':
                    return {
                        'success': False,
                        'error': 'Invite has already been processed'
                    }
                
                # Update notification status to dismissed
                await conn.execute(
                    "UPDATE notifications SET status = 'dismissed', updated_at = NOW() WHERE id = $1",
                    notification_id
                )
                
                space_name = invite['data'].get('spaceName', 'Unknown')
                
                logger.info(f"User {user_id} declined invite {notification_id}")
                
                return {
                    'success': True,
                    'message': 'Invite declined',
                    'spaceName': space_name
                }
                
        except Exception as e:
            logger.error(f"Error declining invite: {e}")
            return {
                'success': False,
                'error': 'Failed to decline invite'
            }
    
    async def get_user_invites(self, user_id: str, include_expired: bool = False) -> Dict[str, Any]:
        """
        Get all invites for a user
        
        Args:
            user_id: ID of the user
            include_expired: Whether to include expired invites
            
        Returns:
            Dict with invites list
        """
        try:
            async with db_manager.get_connection() as conn:
                query = """
                    SELECT id, title, message, data, status, created_at, expires_at
                    FROM notifications
                    WHERE user_id = $1 AND type = 'invites' AND is_active = true
                    AND status = 'unread'
                """
                
                if not include_expired:
                    query += " AND (expires_at IS NULL OR expires_at > NOW())"
                
                query += " ORDER BY created_at DESC"
                
                rows = await conn.fetch(query, user_id)
                
                invites = [
                    {
                        'id': str(row['id']),
                        'title': row['title'],
                        'message': row['message'],
                        'data': row['data'],
                        'status': row['status'],
                        'createdAt': row['created_at'].isoformat(),
                        'expiresAt': row['expires_at'].isoformat() if row['expires_at'] else None,
                        'isExpired': row['expires_at'] < datetime.utcnow() if row['expires_at'] else False
                    }
                    for row in rows
                ]
                
                return {
                    'success': True,
                    'invites': invites,
                    'count': len(invites)
                }
                
        except Exception as e:
            logger.error(f"Error getting user invites: {e}")
            return {
                'success': False,
                'error': 'Failed to get invites',
                'invites': [],
                'count': 0
            }
    
    async def get_all_users(self, requesting_user_id: str, space_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get all users in the system that can be invited
        
        Args:
            requesting_user_id: ID of user requesting the list
            space_id: Optional space ID to filter users not in that space
            
        Returns:
            Dict with users list
        """
        try:
            async with db_manager.get_connection() as conn:
                if space_id:
                    # Get users not in the specified space
                    query = """
                        SELECT u.id, u.username, u.email, u.role, u.avatar_url
                        FROM users u
                        WHERE u.id != $1 
                        AND u.is_active = true
                        AND NOT EXISTS (
                            SELECT 1 FROM user_spaces us 
                            WHERE us.user_id = u.id AND us.space_id = $2
                        )
                        ORDER BY u.username
                    """
                    rows = await conn.fetch(query, requesting_user_id, space_id)
                else:
                    # Get all users except the requesting user
                    query = """
                        SELECT id, username, email, role, avatar_url
                        FROM users
                        WHERE id != $1 AND is_active = true
                        ORDER BY username
                    """
                    rows = await conn.fetch(query, requesting_user_id)
                
                users = [
                    {
                        'id': str(row['id']),
                        'username': row['username'],
                        'email': row['email'],
                        'role': row['role'],
                        'avatarUrl': row['avatar_url']
                    }
                    for row in rows
                ]
                
                return {
                    'success': True,
                    'users': users,
                    'count': len(users)
                }
                
        except Exception as e:
            logger.error(f"Error getting all users: {e}")
            return {
                'success': False,
                'error': 'Failed to get users',
                'users': [],
                'count': 0
            }

# Global invite manager instance
invite_manager = InviteManager()

