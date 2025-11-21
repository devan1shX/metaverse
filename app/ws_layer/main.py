"""
Main WebSocket Server Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import os

from ws_manager import WebsocketManager
from routes import register_websocket_routes
from logger import logger
from db_layer import db_manager
from config import WSConfig

app = FastAPI(
    title="Metaverse WebSocket API",
    description="Real-time WebSocket API for metaverse spaces",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ws_manager = WebsocketManager(app)

@app.on_event("startup")
async def startup_event():
    try:
        logger.info("Starting Metaverse WebSocket Server")
        await db_manager.initialize_pool()
        logger.info("Database connection pool initialized")
        await ws_manager.init_data()
        logger.info("WebSocket manager initialized")
        register_websocket_routes(app, ws_manager)
        logger.info("WebSocket routes registered")
        logger.info(f"WebSocket server ready on {WSConfig.WS_HOST}:{WSConfig.WS_PORT}")
        
    except Exception as e:
        logger.error(f"Failed to start WebSocket server: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    try:
        logger.info("Shutting down WebSocket server")
        await db_manager.close_pool()
        logger.info("Database connection pool closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Metaverse WebSocket API",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/ws/health",
        "api_docs": WEBSOCKET_API_DOCS
    }

@app.get("/ws/api-docs")
async def websocket_api_docs():
    """Get WebSocket API documentation"""
    return WEBSOCKET_API_DOCS

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=WSConfig.WS_HOST,
        port=WSConfig.WS_PORT,
        reload=True,
        log_level="info"
    )