"""
WebSocket Layer Package
Provides real-time communication for the metaverse application
"""

from .manager import WSManager, ConnectionInfo
from .base import DataFetcher, data_fetcher
from .invite import InviteManager, invite_manager
from .handlers import MessageHandler
from .config import WSConfig
from .db_pylayer import DatabaseManager, db_manager

__version__ = '1.0.0'

__all__ = [
    'WSManager',
    'ConnectionInfo',
    'DataFetcher',
    'data_fetcher',
    'InviteManager',
    'invite_manager',
    'MessageHandler',
    'WSConfig',
    'DatabaseManager',
    'db_manager',
]

