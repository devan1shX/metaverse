"""
Chat System with Message Pipeline
"""

import asyncio
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
import uuid
from uuid import UUID 

from fastapi import WebSocket
from pydantic import BaseModel, ValidationError, Field

from logger import logger
from db_layer import get_user_by_id, get_space_by_id, verify_user_access_to_space
from event_types import SpaceEventType, UserEventType, SpaceEvent, UserEvent

# Custom JSON encoder that can handle UUIDs and datetime
class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


class MessageType(Enum):
    SPACE_MESSAGE = "space"
    PRIVATE_MESSAGE = "private"

class MessageStatus(Enum):
    PENDING = "pending"
    VALIDATED = "validated"
    CACHED = "cached"
    BROADCAST = "broadcast"
    PERSISTED = "persisted"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"

@dataclass
class Message:
    message_id: str
    sender_id: str
    message_type: str
    content: str
    timestamp: float
    space_id: Optional[str] = None
    receiver_id: Optional[str] = None
    status: str = MessageStatus.PENDING.value
    retry_count: int = 0
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), cls=CustomEncoder)

class MessageValidator(BaseModel):
    sender_id: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1, max_length=5000)
    message_type: str = Field(..., pattern="^(space|private)$")
    space_id: Optional[str] = None
    receiver_id: Optional[str] = None
    
    @classmethod
    def validate_message(cls, data: Dict) -> tuple[Optional['MessageValidator'], int, str]:
        try:
            validated = cls(**data)
            if validated.message_type == "space" and not validated.space_id:
                return None, 400, "space_id required for space messages"
            if validated.message_type == "private" and not validated.receiver_id:
                return None, 400, "receiver_id required for private messages"
            return validated, 200, "Valid"
        except ValidationError as e:
            return None, 400, str(e)

class RedisCache:
    """Redis cache manager for message reliability"""
    
    # FIX 1: Define REDIS_AVAILABLE inside the __init__
    def __init__(self):
        self.redis_client = None
        self.in_memory_cache: Dict[str, str] = {}
        
        try:
            import redis.asyncio as aioredis
            self.REDIS_AVAILABLE = True
        except ImportError:
            self.REDIS_AVAILABLE = False
            logger.warning("Redis (aioredis) not installed, using in-memory cache")
    
    async def initialize(self):
        """Initialize Redis connection"""
        # FIX 1: Check self.REDIS_AVAILABLE
        if self.REDIS_AVAILABLE:
            try:
                self.redis_client = aioredis.from_url(
                    "redis://localhost:6379",
                    encoding="utf-8",
                    decode_responses=True
                )
                await self.redis_client.ping()
                logger.info("Redis cache initialized")
            except Exception as e:
                logger.warning(f"Redis connection failed, using in-memory: {e}")
                self.redis_client = None
        else:
            logger.info("Using in-memory cache (Redis not available)")
    
    async def save(self, key: str, value: str, ttl: int = 3600):
        try:
            if self.redis_client:
                await self.redis_client.setex(key, ttl, value)
            else:
                self.in_memory_cache[key] = value
            return True
        except Exception as e:
            logger.error(f"Cache save error: {e}")
            return False
    
    async def get(self, key: str) -> Optional[str]:
        try:
            if self.redis_client:
                return await self.redis_client.get(key)
            else:
                return self.in_memory_cache.get(key)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def delete(self, key: str):
        try:
            if self.redis_client:
                await self.redis_client.delete(key)
            else:
                self.in_memory_cache.pop(key, None)
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    async def close(self):
        if self.redis_client:
            await self.redis_client.close()

class MessageDatabase:
    """Database operations for messages"""
    
    @staticmethod
    async def save_message(message: Message) -> bool:
        try:
            from db_layer import get_db_pool
            pool = get_db_pool()
            async with pool.acquire() as conn:
                query = """
                    INSERT INTO messages (
                        message_id, sender_id, message_type, content, 
                        timestamp, space_id, receiver_id, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (message_id) 
                    DO UPDATE SET status = $8
                """
                await conn.execute(
                    query,
                    message.message_id,
                    message.sender_id,
                    message.message_type,
                    message.content,
                    datetime.fromtimestamp(message.timestamp),
                    message.space_id,
                    message.receiver_id,
                    message.status
                )
                logger.info(f"Message {message.message_id} saved to database")
                return True
        except Exception as e:
            logger.error(f"Database save error for message {message.message_id}: {e}")
            return False
    
    @staticmethod
    async def get_message(message_id: str) -> Optional[Message]:
        try:
            from db_layer import get_db_pool
            pool = get_db_pool()
            async with pool.acquire() as conn:
                query = "SELECT * FROM messages WHERE message_id = $1"
                row = await conn.fetchrow(query, message_id)
                if row:
                    return Message(
                        message_id=row['message_id'],
                        sender_id=row['sender_id'],
                        message_type=row['message_type'],
                        content=row['content'],
                        timestamp=row['timestamp'].timestamp(),
                        space_id=row['space_id'],
                        receiver_id=row['receiver_id'],
                        status=row['status']
                    )
                return None
        except Exception as e:
            logger.error(f"Database get error for message {message_id}: {e}")
            return None

class MessagePipeline:
    def __init__(self):
        self.cache = RedisCache()
        self.db_retry_queue: asyncio.Queue = asyncio.Queue()
        self.stats = {"total_processed": 0, "successful": 0, "failed": 0, "retries": 0}
    
    async def initialize(self):
        await self.cache.initialize()
        logger.info("Message pipeline initialized")
    
    async def process_message(
        self, 
        message_data: Dict, 
        ws_manager: Any
    ) -> tuple[bool, str]:
        validated, status_code, error_msg = MessageValidator.validate_message(message_data)
        if not validated:
            logger.error(f"Validation failed: {error_msg}")
            return False, error_msg
        
        auth_result = await self._authenticate_message(validated)
        if not auth_result:
            return False, "Authentication failed"
        
        message = Message(
            message_id=str(uuid.uuid4()),
            sender_id=validated.sender_id,
            message_type=validated.message_type,
            content=validated.content,
            timestamp=asyncio.get_event_loop().time(),
            space_id=validated.space_id,
            receiver_id=validated.receiver_id,
            status=MessageStatus.VALIDATED.value
        )
        
        cache_success = await self._cache_with_retry(message, max_retries=3)
        if not cache_success:
            logger.warning(f"Cache failed for message {message.message_id}, continuing anyway")
        
        broadcast_success = await self._broadcast_message(message, ws_manager)
        if not broadcast_success:
            await self._rollback_message(message)
            return False, "Broadcast failed"
        
        message.status = MessageStatus.BROADCAST.value
        asyncio.create_task(self._persist_with_retry(message))
        
        self.stats["total_processed"] += 1
        self.stats["successful"] += 1
        return True, message.message_id
    
    async def _authenticate_message(self, validated: MessageValidator) -> bool:
        try:
            sender = await get_user_by_id(validated.sender_id)
            if not sender:
                logger.error(f"Sender {validated.sender_id} not found")
                return False
            if validated.message_type == "space":
                space = await get_space_by_id(validated.space_id)
                if not space:
                    logger.error(f"Space {validated.space_id} not found")
                    return False
            if validated.message_type == "private":
                receiver = await get_user_by_id(validated.receiver_id)
                if not receiver:
                    logger.error(f"Receiver {validated.receiver_id} not found")
                    return False
            return True
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return False
    
    async def _cache_with_retry(self, message: Message, max_retries: int = 3) -> bool:
        for attempt in range(max_retries):
            try:
                cache_key = f"msg:{message.message_id}"
                success = await self.cache.save(cache_key, message.to_json())
                if success:
                    message.status = MessageStatus.CACHED.value
                    logger.debug(f"Message {message.message_id} cached (attempt {attempt + 1})")
                    return True
                if attempt < max_retries - 1:
                    await asyncio.sleep(0.1 * (attempt + 1)) 
            except Exception as e:
                logger.error(f"Cache attempt {attempt + 1} failed: {e}")
        return False
    
    async def _broadcast_message(self, message: Message, ws_manager: Any) -> bool:
        try:
            from space_broadcaster import get_space_broadcaster, user_ws_mapping 
            
            if message.message_type == MessageType.SPACE_MESSAGE.value:
                event = SpaceEvent(
                    event_type=SpaceEventType.CHAT_MESSAGE,
                    space_id=message.space_id,
                    payload={
                        "message_id": message.message_id,
                        "user_id": message.sender_id,
                        "message": message.content,
                        "timestamp": message.timestamp
                    },
                    timestamp=message.timestamp
                )
                sender = await get_user_by_id(message.sender_id)
                if sender:
                    event.payload["user_name"] = sender.get("user_name", "Unknown")
                await ws_manager.space_updates.put(event.to_dict())
                logger.info(f"Space message {message.message_id} queued for space {message.space_id}")
            else:
                event = UserEvent(
                    event_type=UserEventType.PRIVATE_MESSAGE,
                    user_id=message.receiver_id,
                    payload={
                        "message_id": message.message_id,
                        "from_user_id": message.sender_id,
                        "message": message.content,
                        "timestamp": message.timestamp
                    },
                    timestamp=message.timestamp
                )
                sender = await get_user_by_id(message.sender_id)
                if sender:
                    event.payload["from_user_name"] = sender.get("user_name", "Unknown")
                
                receiver_ws = user_ws_mapping.get(message.receiver_id)
                if receiver_ws:
                    try:
                        await receiver_ws.send_text(event.to_json(cls=CustomEncoder))
                    except Exception as e:
                        logger.warning(f"Failed to send PM to receiver {message.receiver_id}: {e}")
                
                confirmation = UserEvent(
                    event_type=UserEventType.PRIVATE_MESSAGE,
                    user_id=message.sender_id,
                    payload={
                        "message_id": message.message_id,
                        "to_user_id": message.receiver_id,
                        "message": message.content,
                        "sent": True,
                        "timestamp": message.timestamp
                    },
                    timestamp=message.timestamp
                )
                sender_ws = user_ws_mapping.get(message.sender_id)
                if sender_ws:
                    try:
                        await sender_ws.send_text(confirmation.to_json(cls=CustomEncoder))
                    except Exception as e:
                        logger.warning(f"Failed to send PM confirmation to sender {message.sender_id}: {e}")
                
                logger.info(f"Private message {message.message_id} sent from {message.sender_id} to {message.receiver_id}")
            return True
        except Exception as e:
            logger.error(f"Broadcast error for message {message.message_id}: {e}", exc_info=True)
            return False
    
    async def _persist_with_retry(self, message: Message, max_retries: int = 5):
        for attempt in range(max_retries):
            try:
                success = await MessageDatabase.save_message(message)
                if success:
                    message.status = MessageStatus.PERSISTED.value
                    logger.info(f"Message {message.message_id} persisted (attempt {attempt + 1})")
                    await self.cache.delete(f"msg:{message.message_id}")
                    return
                if attempt < max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1)) 
            except Exception as e:
                logger.error(f"Persistence attempt {attempt + 1} failed for message {message.message_id}: {e}")
        
        logger.error(f"Failed to persist message {message.message_id} after {max_retries} attempts")
        self.stats["failed"] += 1
        await self.db_retry_queue.put(message)
    
    async def _rollback_message(self, message: Message):
        try:
            logger.warning(f"Rolling back message {message.message_id}")
            await self.cache.delete(f"msg:{message.message_id}")
            message.status = MessageStatus.ROLLED_BACK.value
            logger.info(f"Message {message.message_id} rolled back")
        except Exception as e:
            logger.error(f"Rollback error for message {message.message_id}: {e}")
    
    async def cleanup(self):
        await self.cache.close()

class ChatManager:
    def __init__(self, ws_manager: Any):
        self.ws_manager = ws_manager
        self.pipeline = MessagePipeline()
        self.initialized = False
    
    async def initialize(self):
        if not self.initialized:
            await self.pipeline.initialize()
            self.initialized = True
            logger.info("ChatManager initialized")
    
    async def handle_space_message(self, message_data: Dict) -> tuple[bool, str]:
        try:
            message_data["message_type"] = "space"
            success, result = await self.pipeline.process_message(
                message_data,
                self.ws_manager
            )
            return success, result
        except Exception as e:
            logger.error(f"Space message handler error: {e}")
            return False, str(e)
    
    async def handle_private_message(self, message_data: Dict) -> tuple[bool, str]:
        try:
            message_data["message_type"] = "private"
            success, result = await self.pipeline.process_message(
                message_data,
                self.ws_manager
            )
            return success, result
        except Exception as e:
            logger.error(f"Private message handler error: {e}")
            return False, str(e)
    
    def get_stats(self) -> Dict:
        return self.pipeline.stats
    
    async def cleanup(self):
        await self.pipeline.cleanup()

__all__ = [
    'ChatManager',
    'MessagePipeline',
    'MessageValidator',
    'Message',
    'MessageType',
    'MessageStatus'
]