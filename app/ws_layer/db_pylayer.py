# maintain the db connection for this python layer 
import dotenv 
import os   
import asyncio
import asyncpg
import logging
from typing import Optional

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

async def get_db_connection():
    """Legacy function for backward compatibility"""
    return await db_manager.get_connection()