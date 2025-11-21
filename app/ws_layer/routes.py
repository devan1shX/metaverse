"""
WebSocket Routes and Endpoints for Metaverse Application
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
import json
import asyncio
from typing import Dict, List, Any
from space_broadcaster import get_space_broadcaster
from logger import logger
from config import WSConfig

def register_websocket_routes(app: FastAPI, ws_manager):
    @app.websocket("/ws/metaverse/space")
    async def ws_endpoint(websocket: WebSocket):
        await websocket.accept()
        sb = None
        subscribed = False
        parser_task = None # Task for handling messages from this specific client

        try:
            # First, wait for subscribe message
            while not subscribed:
                data = await websocket.receive_text()
                message = json.loads(data)
                logger.info(f"Received message: {message}")
                event = message.get("event", None)

                if event and event.lower() == "subscribe":
                    space_id = message.get("space_id", None)
                    if space_id:
                        sb = get_space_broadcaster(space_id)
                        logger.info(f"Adding subscriber to space {space_id}")
                        
                        # add_subscriber now creates and returns the parser task
                        parser_task = sb.add_subscriber(websocket)
                        
                        # Start the broadcaster's main loop (if not already running)
                        await sb.start_if_not_running()
                        
                        logger.info(f"Space broadcaster ready for space {space_id}")
                        subscribed = True
                        
                        # Send confirmation
                        await websocket.send_text(json.dumps({"event": "subscribed", "space_id": space_id}))
                        
                        # Await the parser task. This will keep the connection alive
                        # and handle all incoming messages until disconnect.
                        await parser_task

                    else:
                        await websocket.send_text(json.dumps({"event": "error", "message": "space_id required"}))
                else:
                    await websocket.send_text(json.dumps({"event": "error", "message": "Please send subscribe event first"}))

        except WebSocketDisconnect:
            logger.info("WebSocket client disconnected")
        except asyncio.CancelledError:
            logger.info("WebSocket connection task cancelled")
        except Exception as e: 
            logger.error(f"Error in ws_endpoint: {e}", exc_info=True)
        finally:
            # The parser_task is the main task for this connection.
            # If it's cancelled (e.g., by disconnect), this finally block runs.
            # We must ensure the parser task is cancelled and removed from the broadcaster.
            if sb and websocket in sb.parser_tasks:
                task = sb.parser_tasks[websocket]
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                del sb.parser_tasks[websocket]
            
            # Remove websocket from subscribers if it was added
            if sb and websocket in sb.subscribers:
                sb.subscribers.remove(websocket)
            
            # Cleanup broadcaster if it exists and has no more subscribers
            if sb and len(sb.subscribers) == 0:
                logger.info(f"No subscribers left in space {sb.space_id}. Stopping broadcaster.")
                await sb.stop()