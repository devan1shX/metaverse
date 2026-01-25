# base py file for fetching data from the node layer and database
import asyncio
import logging
from typing import Optional, Dict, Any
from .db_pylayer import db_manager

logger = logging.getLogger(__name__)

class DataFetcher:
    def __init__(self):
        self.db_manager = db_manager
    
    async def fetch_user_data(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch user data from database"""
        try:
            async with self.db_manager.get_connection() as conn:
                query = """
                    SELECT id, user_name, email, role, user_avatar_url, user_is_active, 
                           user_created_at, user_updated_at
                    FROM users 
                    WHERE id = $1 AND user_is_active = true
                """
                row = await conn.fetchrow(query, user_id)
                
                if row:
                    return {
                        'id': str(row['id']),
                        'username': row['user_name'],
                        'email': row['email'],
                        'role': row['role'],
                        'avatar_url': row['user_avatar_url'],
                        'is_active': row['user_is_active'],
                        'created_at': row['user_created_at'].isoformat(),
                        'updated_at': row['user_updated_at'].isoformat()
                    }
                return None
        except Exception as e:
            logger.error(f"Error fetching user data for {user_id}: {e}")
            return None
    
    async def fetch_space_data(self, space_id: str) -> Optional[Dict[str, Any]]:
        """Fetch space data from database"""
        try:
            async with self.db_manager.get_connection() as conn:
                query = """
                    SELECT id, name, description, map_image_url, admin_user_id, 
                           is_public, max_users, is_active, created_at, updated_at
                    FROM spaces 
                    WHERE id = $1 AND is_active = true
                """
                row = await conn.fetchrow(query, space_id)
                
                if row:
                    return {
                        'id': str(row['id']),
                        'name': row['name'],
                        'description': row['description'],
                        'map_image_url': row['map_image_url'],
                        'admin_user_id': str(row['admin_user_id']),
                        'is_public': row['is_public'],
                        'max_users': row['max_users'],
                        'is_active': row['is_active'],
                        'created_at': row['created_at'].isoformat(),
                        'updated_at': row['updated_at'].isoformat()
                    }
                return None
        except Exception as e:
            logger.error(f"Error fetching space data for {space_id}: {e}")
            return None
    
    async def fetch_space_users(self, space_id: str) -> list:
        """Fetch users currently in a space"""
        try:
            async with self.db_manager.get_connection() as conn:
                query = """
                    SELECT u.id, u.user_name, u.email, u.role, u.user_avatar_url
                    FROM users u
                    INNER JOIN user_spaces us ON u.id = us.user_id
                    WHERE us.space_id = $1 AND u.user_is_active = true
                """
                rows = await conn.fetch(query, space_id)
                
                return [
                    {
                        'id': str(row['id']),
                        'username': row['user_name'],
                        'email': row['email'],
                        'role': row['role'],
                        'avatar_url': row['user_avatar_url']
                    }
                    for row in rows
                ]
        except Exception as e:
            logger.error(f"Error fetching space users for {space_id}: {e}")
            return []
    
    async def validate_user_space_access(self, user_id: str, space_id: str) -> bool:
        """Validate if user has access to the space"""
        try:
            async with self.db_manager.get_connection() as conn:
                # Check if user is admin of the space or has joined the space
                query = """
                    SELECT 1 FROM spaces s
                    LEFT JOIN user_spaces us ON s.id = us.space_id AND us.user_id = $1
                    WHERE s.id = $2 AND s.is_active = true
                    AND (s.admin_user_id = $1 OR us.user_id IS NOT NULL)
                """
                row = await conn.fetchrow(query, user_id, space_id)
                return row is not None
        except Exception as e:
            logger.error(f"Error validating user space access: {e}")
            return False
    
    async def get_user_spaces(self, user_id: str) -> list:
        """Get all spaces a user has access to"""
        try:
            async with self.db_manager.get_connection() as conn:
                query = """
                    SELECT DISTINCT s.id, s.name, s.description, s.map_image_url,
                           s.admin_user_id, s.is_public, s.max_users, s.is_active,
                           s.created_at, s.updated_at
                    FROM spaces s
                    LEFT JOIN user_spaces us ON s.id = us.space_id
                    WHERE (s.admin_user_id = $1 OR us.user_id = $1)
                    AND s.is_active = true
                    ORDER BY s.created_at DESC
                """
                rows = await conn.fetch(query, user_id)
                
                return [
                    {
                        'id': str(row['id']),
                        'name': row['name'],
                        'description': row['description'],
                        'map_image_url': row['map_image_url'],
                        'admin_user_id': str(row['admin_user_id']),
                        'is_public': row['is_public'],
                        'max_users': row['max_users'],
                        'is_active': row['is_active'],
                        'created_at': row['created_at'].isoformat(),
                        'updated_at': row['updated_at'].isoformat()
                    }
                    for row in rows
                ]
        except Exception as e:
            logger.error(f"Error fetching user spaces for {user_id}: {e}")
            return []

# Global data fetcher instance
data_fetcher = DataFetcher()

def FetchUserData(user_id: str) -> Optional[Dict[str, Any]]:
    """Legacy function for backward compatibility"""
    return asyncio.run(data_fetcher.fetch_user_data(user_id))