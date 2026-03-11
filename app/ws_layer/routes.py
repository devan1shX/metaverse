"""
WebSocket Routes and Endpoints for Metaverse Application
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import json
import asyncio
import time
from typing import Dict, List, Any, Optional
from space_broadcaster import get_space_broadcaster, space_broadcaster_manager, user_ws_mapping
from logger import logger
from config import WSConfig
from db_layer import db_manager
from generate_latency_report import LatencyReportConfig, generate_full_latency_report
from latency import (
    elapsed_ms,
    get_latency_stats,
    is_latency_profiling_enabled,
    perf_now,
    record_duration,
    reset_latency_stats,
    set_latency_profiling_enabled,
)


class LatencyReportRequest(BaseModel):
    space_id: Optional[str] = None
    ws_url: Optional[str] = None
    ws_host: Optional[str] = None
    ws_port: Optional[int] = Field(default=None, ge=1, le=65535)
    client_count: int = Field(default=20, ge=2, le=500)
    user_ids: Optional[List[str]] = None
    moves_per_client: int = Field(default=5, ge=1, le=200)
    connect_concurrency: int = Field(default=8, ge=1, le=100)
    timeout_seconds: float = Field(default=8.0, gt=0.1, le=60.0)
    spike_threshold_ms: float = Field(default=2000.0, gt=0.0)
    tail_ratio_limit: float = Field(default=2.0, gt=1.0)
    include_samples: bool = False


def register_websocket_routes(app: FastAPI, ws_manager):
    if not hasattr(app.state, "ws_start_time"):
        app.state.ws_start_time = time.time()

    existing_health_route = any(
        getattr(route, "path", None) == "/ws/health" and "GET" in getattr(route, "methods", set())
        for route in app.router.routes
    )

    if not existing_health_route:
        @app.get("/ws/health")
        async def websocket_health():
            """Detailed health report for WebSocket service."""
            db_status = "unhealthy"
            db_error = None

            try:
                if db_manager.pool is not None:
                    async with db_manager.pool.acquire() as conn:
                        await conn.fetchval("SELECT 1")
                    db_status = "healthy"
                else:
                    db_error = "Database pool is not initialized"
            except Exception as e:
                db_error = str(e)

            total_subscribers = 0
            active_space_ids = []
            for space_id, broadcaster in space_broadcaster_manager.items():
                subscriber_count = len(getattr(broadcaster, "subscribers", []))
                if subscriber_count > 0:
                    active_space_ids.append(space_id)
                    total_subscribers += subscriber_count

            services = {
                "websocket_server": {
                    "status": "healthy",
                    "details": {
                        "host": WSConfig.WS_HOST,
                        "port": WSConfig.WS_PORT,
                        "connected_users": len(user_ws_mapping),
                        "active_spaces": len(active_space_ids),
                        "active_space_ids": active_space_ids,
                        "active_subscribers": total_subscribers
                    }
                },
                "database": {
                    "status": db_status,
                    "error": db_error
                }
            }

            overall_status = "healthy" if db_status == "healthy" else "degraded"
            return {
                "success": overall_status == "healthy",
                "status": overall_status,
                "message": "WebSocket service health report",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "uptime": time.time() - app.state.ws_start_time,
                "services": services
            }

    existing_latency_route = any(
        getattr(route, "path", None) == "/ws/latency-stats" and "GET" in getattr(route, "methods", set())
        for route in app.router.routes
    )

    if not existing_latency_route:
        @app.get("/ws/latency-stats")
        async def websocket_latency_stats(reset: bool = False):
            if not is_latency_profiling_enabled():
                return JSONResponse(
                    status_code=404,
                    content={
                        "success": False,
                        "message": "Latency profiling is disabled. Set WS_LATENCY_PROFILING=1 to enable it.",
                    },
                )

            stats = get_latency_stats(include_space_breakdown=True)
            if reset:
                reset_latency_stats()
            return {"success": True, "data": stats}

    existing_report_route = any(
        getattr(route, "path", None) == "/ws/latency-report" and "POST" in getattr(route, "methods", set())
        for route in app.router.routes
    )

    if not existing_report_route:
        @app.post("/ws/latency-report")
        async def websocket_latency_report(payload: LatencyReportRequest, request: Request):
            """
            Run a full WS latency workload and return a consolidated report.
            """
            if not is_latency_profiling_enabled():
                set_latency_profiling_enabled(True)

            request_data = payload.model_dump()
            if not request_data.get("ws_url"):
                host = request_data.get("ws_host") or request.url.hostname or WSConfig.WS_HOST
                port = request_data.get("ws_port") or request.url.port or WSConfig.WS_PORT
                if host in {"0.0.0.0", "::"}:
                    host = "127.0.0.1"
                request_data["ws_url"] = f"ws://{host}:{port}/ws/metaverse/space"

            try:
                report = await generate_full_latency_report(LatencyReportConfig(**request_data))
                return {"success": report.get("success", False), "data": report}
            except Exception as e:
                logger.error(f"Error generating latency report: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Failed to generate latency report: {e}")

    @app.websocket("/ws/metaverse/space")
    async def ws_endpoint(websocket: WebSocket):
        await websocket.accept()
        record_duration("subscribe", "connection_accepted", 0.0)
        sb = None
        subscribed = False
        parser_task = None # Task for handling messages from this specific client

        try:
            # First, wait for subscribe message
            while not subscribed:
                data = await websocket.receive_text()
                parse_start = perf_now()
                try:
                    message = json.loads(data)
                except json.JSONDecodeError:
                    record_duration("subscribe", "receive_to_parse", elapsed_ms(parse_start))
                    await websocket.send_text(json.dumps({"event": "error", "message": "Invalid JSON"}))
                    continue

                logger.info(f"Received message: {message}")
                event = message.get("event", None)
                event_lower = event.lower() if isinstance(event, str) else "subscribe"
                record_duration(event_lower, "receive_to_parse", elapsed_ms(parse_start))

                if event and event.lower() == "subscribe":
                    handle_start = perf_now()
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
                        record_duration("subscribe", "handle", elapsed_ms(handle_start), space_id=space_id)
                        
                        # Await the parser task. This will keep the connection alive
                        # and handle all incoming messages until disconnect.
                        await parser_task

                    else:
                        record_duration("subscribe", "handle", elapsed_ms(handle_start))
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
