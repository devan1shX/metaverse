# maintain the db connection for this python layer 
import dotenv 
import os   
import asyncio
import asyncpg
import logging
from typing import Optional, List, Dict, Any
import json

dotenv.load_dotenv()

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        
    async def initialize_pool(self):
        """Initialize the database connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                host=os.getenv('DB_HOST', 'localhost'),
                port=int(os.getenv('DB_PORT', 5433)),
                user=os.getenv('DB_USER', 'postgres'),
                password=os.getenv('DB_PASSWORD', 'aahan123'),
                database=os.getenv('DATABASE', 'postgres'),
                min_size=1,
                max_size=10
            )
            logger.info("Database connection pool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            raise
    async def get_async_db(self ):
        return await self.get_connection()
    async def get_connection(self):
        """Get a connection from the pool"""
        if not self.pool:
            await self.initialize_pool()
        return self.pool.acquire()
    
    async def close_pool(self):
        """Close the database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")

# Global database manager instance
db_manager = DatabaseManager()

async def get_async_db():
    """Legacy function for backward compatibility"""
    return await db_manager.get_connection()

def get_db_pool():
    """Get the database connection pool"""
    return db_manager.pool

# ###################################
# ## Space-related database functions
# ###################################

async def get_space_by_id(space_id: str) -> Optional[Dict[str, Any]]:
    """Get complete space information by ID"""
    try:
        async with db_manager.pool.acquire() as conn:
            result = await conn.fetchrow(
                """
                SELECT 
                    s.*,
                    json_agg(
                        json_build_object(
                            'id', u.id,
                            'user_name', u.user_name,
                            'email', u.email,
                            'role', u.role,
                            'user_designation', u.user_designation,
                            'user_avatar_url', u.user_avatar_url,
                            'user_about', u.user_about,
                            'user_is_active', u.user_is_active,
                            'joined_at', us.joined_at,
                            'is_admin', CASE WHEN u.id = s.admin_user_id THEN true ELSE false END
                        )
                    ) as users
                FROM spaces s
                LEFT JOIN user_spaces us ON s.id = us.space_id
                LEFT JOIN users u ON us.user_id = u.id
                WHERE s.id = $1
                GROUP BY s.id
                """,
                space_id
            )
            
            if result:
                space_data = dict(result)
                # Parse the JSON string for users
                if space_data['users']:
                    try:
                        import json
                        users_list = json.loads(space_data['users'])
                        # Handle case where no users are in the space (null user)
                        if users_list and len(users_list) > 0 and users_list[0]['id'] is None:
                            space_data['users'] = []
                        else:
                            space_data['users'] = users_list
                    except (json.JSONDecodeError, TypeError):
                        space_data['users'] = []
                else:
                    space_data['users'] = []
                return space_data
            return None
    except Exception as e:
        logger.error(f"Error getting space by ID {space_id}: {e}")
        return None

async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user information by ID"""
    try:
        async with db_manager.pool.acquire() as conn:
            result = await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1",
                user_id
            )
            return dict(result) if result else None
    except Exception as e:
        logger.error(f"Error getting user by ID {user_id}: {e}")
        return None

async def add_user_to_space(user_id: str, space_id: str) -> bool:
    """Add user to space in database"""
    try:
        async with db_manager.pool.acquire() as conn:
            # Check if user is already in space
            existing = await conn.fetchrow(
                "SELECT 1 FROM user_spaces WHERE user_id = $1 AND space_id = $2",
                user_id, space_id
            )
            
            if existing:
                logger.warning(f"User {user_id} already in space {space_id}")
                return False
            
            # Add user to space
            await conn.execute(
                """
                INSERT INTO user_spaces (user_id, space_id, joined_at)
                VALUES ($1, $2, NOW())
                """,
                user_id, space_id
            )
            
            # Update user's user_spaces JSONB field
            await conn.execute(
                """
                UPDATE users 
                SET user_spaces = user_spaces || $1::jsonb,
                    user_updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                """,
                json.dumps([space_id]), user_id
            )
            
            logger.info(f"Added user {user_id} to space {space_id}")
            return True
    except Exception as e:
        logger.error(f"Error adding user {user_id} to space {space_id}: {e}")
        return False

async def remove_user_from_space(user_id: str, space_id: str) -> bool:
    """Remove user from space in database"""
    try:
        async with db_manager.pool.acquire() as conn:
            # Remove from user_spaces table
            result = await conn.execute(
                "DELETE FROM user_spaces WHERE user_id = $1 AND space_id = $2",
                user_id, space_id
            )
            
            if result == "DELETE 0":
                logger.warning(f"User {user_id} not found in space {space_id}")
                return False
            
            # Update user's user_spaces JSONB field
            await conn.execute(
                """
                UPDATE users 
                SET user_spaces = user_spaces - $1,
                    user_updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                """,
                space_id, user_id
            )
            
            logger.info(f"Removed user {user_id} from space {space_id}")
            return True
    except Exception as e:
        logger.error(f"Error removing user {user_id} from space {space_id}: {e}")
        return False

async def get_users_in_space(space_id: str) -> List[Dict[str, Any]]:
    """Get all users currently in a space"""
    try:
        async with db_manager.pool.acquire() as conn:
            results = await conn.fetch(
                """
                SELECT 
                    u.id, u.user_name, u.email, u.role, u.user_designation,
                    u.user_avatar_url, u.user_about, u.user_is_active,
                    us.joined_at,
                    CASE WHEN u.id = s.admin_user_id THEN true ELSE false END as is_admin
                FROM user_spaces us
                JOIN users u ON us.user_id = u.id
                JOIN spaces s ON us.space_id = s.id
                WHERE us.space_id = $1
                ORDER BY us.joined_at ASC
                """,
                space_id
            )
            return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Error getting users in space {space_id}: {e}")
        return []

async def get_user_spaces(user_id: str) -> List[Dict[str, Any]]:
    """Get all spaces a user is part of"""
    try:
        async with db_manager.pool.acquire() as conn:
            results = await conn.fetch(
                """
                SELECT 
                    s.*,
                    us.joined_at,
                    CASE WHEN s.admin_user_id = $1 THEN true ELSE false END as is_admin
                FROM user_spaces us
                JOIN spaces s ON us.space_id = s.id
                WHERE us.user_id = $1
                ORDER BY us.joined_at DESC
                """,
                user_id
            )
            return [dict(row) for row in results]
    except Exception as e:
        logger.error(f"Error getting spaces for user {user_id}: {e}")
        return []

async def verify_user_access_to_space(user_id: str, space_id: str) -> bool:
    """Verify if user has access to a space"""
    try:
        async with db_manager.pool.acquire() as conn:
            # Check if user is in space or space is public
            result = await conn.fetchrow(
                """
                SELECT 
                    CASE 
                        WHEN EXISTS(SELECT 1 FROM user_spaces WHERE user_id = $1 AND space_id = $2) THEN true
                        WHEN EXISTS(SELECT 1 FROM spaces WHERE id = $2 AND is_public = true) THEN true
                        ELSE false
                    END as has_access
                """,
                user_id, space_id
            )
            return result['has_access'] if result else False
    except Exception as e:
        logger.error(f"Error verifying user access to space: {e}")
        return False

# Legacy functions for backward compatibility
async def get_all_spaces():
    """Get all space IDs"""
    try:
        async with db_manager.pool.acquire() as conn:
            results = await conn.fetch("SELECT id FROM spaces WHERE is_active = true")
            return [row['id'] for row in results]
    except Exception as e:
        logger.error(f"Error getting all spaces: {e}")
        return []

async def get_all_users():
    """Get all user IDs"""
    try:
        async with db_manager.pool.acquire() as conn:
            results = await conn.fetch("SELECT id FROM users WHERE user_is_active = true")
            return [row['id'] for row in results]
    except Exception as e:
        logger.error(f"Error getting all users: {e}")
        return []