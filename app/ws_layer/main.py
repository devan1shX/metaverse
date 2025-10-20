"""
WebSocket Server Main Entry Point
"""
import asyncio
import logging
import signal
import sys
from .manager import WSManager
from .db_pylayer import db_manager
from .config import WSConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('ws_server.log')
    ]
)

logger = logging.getLogger(__name__)

class WebSocketServer:
    """Main WebSocket Server Application"""
    
    def __init__(self):
        self.ws_manager = WSManager()
        self.config = WSConfig()
        self.server = None
        self.running = False
    
    async def start(self):
        """Start the WebSocket server"""
        try:
            logger.info("Initializing WebSocket Server...")
            
            # Initialize database connection pool
            await db_manager.initialize_pool()
            logger.info("Database connection pool initialized")
            
            # Start WebSocket server
            self.server = await self.ws_manager.start_server(
                host=self.config.WS_HOST,
                port=self.config.WS_PORT
            )
            
            self.running = True
            logger.info(f"WebSocket server running on {self.config.WS_HOST}:{self.config.WS_PORT}")
            
            # Keep server running
            await asyncio.Future()  # Run forever
            
        except Exception as e:
            logger.error(f"Failed to start WebSocket server: {e}")
            raise
    
    async def stop(self):
        """Stop the WebSocket server"""
        if not self.running:
            return
        
        logger.info("Shutting down WebSocket server...")
        self.running = False
        
        try:
            # Stop WebSocket server
            await self.ws_manager.stop_server()
            
            # Close database connections
            await db_manager.close_pool()
            
            logger.info("WebSocket server shut down successfully")
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
    
    def setup_signal_handlers(self, loop):
        """Setup signal handlers for graceful shutdown"""
        def signal_handler(signame):
            logger.info(f"Received signal {signame}")
            asyncio.create_task(self.stop())
            loop.stop()
        
        for signame in ('SIGINT', 'SIGTERM'):
            loop.add_signal_handler(
                getattr(signal, signame),
                lambda: signal_handler(signame)
            )

def main():
    """Main entry point"""
    server = WebSocketServer()
    loop = asyncio.get_event_loop()
    
    # Setup signal handlers
    server.setup_signal_handlers(loop)
    
    try:
        loop.run_until_complete(server.start())
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Server error: {e}")
    finally:
        loop.run_until_complete(server.stop())
        loop.close()
        logger.info("Server stopped")

if __name__ == '__main__':
    main()

