import asyncio
import websockets
import json
import logging
from typing import Dict, Set, Optional, Any
from .base import data_fetcher
from .handlers import MessageHandler
from .config import WSConfig

logger = logging.getLogger(__name__)

class ConnectionInfo:
    def __init__(self, websocket, user_id: Optional[str] = None, space_id: Optional[str] = None):
        self.websocket = websocket
        self.user_id = user_id
        self.space_id = space_id
        self.is_authenticated = False
        self.last_activity = asyncio.get_event_loop().time()

class WSManager:
    def __init__(self):
        self.connections: Dict[websockets.WebSocketServerProtocol, ConnectionInfo] = {}
        self.space_connections: Dict[str, Set[websockets.WebSocketServerProtocol]] = {}
        self.user_connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.message_handler = MessageHandler()
        self.config = WSConfig()
        self.server: Optional[websockets.WebSocketServer] = None
        
    async def start_server(self, host: str = "localhost", port: int = 5001):
        """Start the WebSocket server"""
        try:
            logger.info(f"Starting WebSocket server on {host}:{port}")
            self.server = await websockets.serve(
                self.handle_connection,
                host,
                port,
                ping_interval=30,
                ping_timeout=10
            )
            logger.info(f"WebSocket server started successfully on {host}:{port}")
            return self.server
        except Exception as e:
            logger.error(f"Failed to start WebSocket server: {e}")
            raise
    
    async def handle_connection(self, websocket, path):
        """Handle new WebSocket connections"""
        client_address = websocket.remote_address
        logger.info(f"New WebSocket connection from {client_address}")
        
        # Initialize connection info
        conn_info = ConnectionInfo(websocket)
        self.connections[websocket] = conn_info
        
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"WebSocket connection closed: {client_address}")
        except Exception as e:
            logger.error(f"Error handling WebSocket connection: {e}")
        finally:
            await self.handle_disconnection(websocket)
    
    async def handle_message(self, websocket, message: str):
        """Handle incoming WebSocket messages"""
        try:
            # Update last activity
            if websocket in self.connections:
                self.connections[websocket].last_activity = asyncio.get_event_loop().time()
            
            # Parse message
            try:
                data = json.loads(message)
            except json.JSONDecodeError:
                await self.send_error(websocket, "Invalid JSON format")
                return
            
            # Process message through handler
            response = await self.message_handler.handle_message(
                websocket, 
                data, 
                self.connections.get(websocket)
            )
            
            if response:
                await self.send_response(websocket, response)
                
                # Handle broadcasting for certain events
                if response.get('status') == 'success':
                    await self.handle_broadcast(websocket, response)
                    
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await self.send_error(websocket, "Internal server error")
    
    async def handle_disconnection(self, websocket):
        """Handle WebSocket disconnections"""
        conn_info = self.connections.get(websocket)
        if conn_info:
            # Remove from space connections
            if conn_info.space_id and conn_info.space_id in self.space_connections:
                self.space_connections[conn_info.space_id].discard(websocket)
                if not self.space_connections[conn_info.space_id]:
                    del self.space_connections[conn_info.space_id]
            
            # Remove from user connections
            if conn_info.user_id and conn_info.user_id in self.user_connections:
                del self.user_connections[conn_info.user_id]
            
            # Broadcast user left event
            if conn_info.user_id and conn_info.space_id:
                await self.broadcast_to_space(
                    conn_info.space_id,
                    {
                        'type': 'USER_LEFT',
                        'spaceId': conn_info.space_id,
                        'userId': conn_info.user_id,
                        'username': await self.get_username(conn_info.user_id)
                    },
                    exclude_websocket=websocket
                )
            
            # Remove from connections
            del self.connections[websocket]
    
    async def handle_broadcast(self, websocket, response: Dict[str, Any]):
        """Handle broadcasting events to other users"""
        conn_info = self.connections.get(websocket)
        if not conn_info or not conn_info.space_id:
            return
        
        # Handle join space success
        if (response.get('message') == 'Join space successful' and 
            'data' in response):
            data = response['data']
            await self.broadcast_to_space(
                conn_info.space_id,
                {
                    'type': 'USER_JOINED',
                    'spaceId': conn_info.space_id,
                    'userId': data.get('user', {}).get('id'),
                    'username': data.get('user', {}).get('username'),
                    'position': data.get('position', {})
                },
                exclude_websocket=websocket
            )
    
    async def broadcast_to_space(self, space_id: str, message: Dict[str, Any], 
                                exclude_websocket: Optional[websockets.WebSocketServerProtocol] = None):
        """Broadcast message to all users in a space"""
        if space_id not in self.space_connections:
            return
        
        message_str = json.dumps(message)
        tasks = []
        
        for websocket in self.space_connections[space_id]:
            if websocket != exclude_websocket and not websocket.closed:
                tasks.append(self.send_message(websocket, message_str))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def send_response(self, websocket, response: Dict[str, Any]):
        """Send response to a specific WebSocket connection"""
        await self.send_message(websocket, json.dumps(response))
    
    async def send_error(self, websocket, error_message: str):
        """Send error response to a specific WebSocket connection"""
        await self.send_response(websocket, {
            'status': 'failed',
            'error': error_message
        })
    
    async def send_message(self, websocket, message: str):
        """Send a message to a WebSocket connection"""
        try:
            await websocket.send(message)
        except websockets.exceptions.ConnectionClosed:
            logger.warning("Attempted to send message to closed connection")
        except Exception as e:
            logger.error(f"Error sending message: {e}")
    
    async def get_username(self, user_id: str) -> str:
        """Get username for a user ID"""
        user_data = await data_fetcher.fetch_user_data(user_id)
        return user_data.get('username', 'Unknown') if user_data else 'Unknown'
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        return {
            'total_connections': len(self.connections),
            'authenticated_connections': sum(1 for conn in self.connections.values() if conn.is_authenticated),
            'spaces_with_users': len(self.space_connections),
            'space_details': {
                space_id: len(connections) 
                for space_id, connections in self.space_connections.items()
            }
        }
    
    async def stop_server(self):
        """Stop the WebSocket server"""
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            logger.info("WebSocket server stopped")