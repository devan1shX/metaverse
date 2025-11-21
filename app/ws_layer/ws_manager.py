import asyncio
import json
import sys
import os
from typing import List, Dict, Any

from fastapi import WebSocket, FastAPI, WebSocketDisconnect
from pydantic import ValidationError

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from logger import logger
from validators.join import JoinMessageValidator, verify_token
from db_layer import (
    get_all_spaces, get_all_users, get_space_by_id, get_user_by_id,
    add_user_to_space, remove_user_from_space, get_users_in_space,
    verify_user_access_to_space
)
from config import WSConfig
from event_types import SpaceEventType, UserEventType, SpaceEvent, UserEvent, UserState
from chat import ChatManager
from media import MediaManager
from space_broadcaster import space_broadcaster

class WebsocketManager:
    """
    Manages WebSocket connections, user and space state, and message broadcasting
    for the metaverse application.
    """

    def __init__(self, app: FastAPI):
        self.app = app
        self.space_updates = {} # space id ->  queue
        self.user_updates = {} # user_id - > queue 
        

    async def init_data(self):
        """Initializes queues for all existing spaces and users from the database."""
        try:
            spaces = await get_all_spaces()
            for space_id in spaces:
                self.space_updates[space_id] = asyncio.Queue()
            
            users = await get_all_users()
            for user_id in users:
                self.user_updates[user_id] = asyncio.Queue()
        except Exception as e:
            logger.error(f"Failed to initialize data: {e}")

    async def check_user_validity(self , user_id : str)-> bool:
        user = await get_user_by_id(user_id)
        if not user:
            return False
        return True 
    