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

# WebSocket API Documentation
WEBSOCKET_API_DOCS = {
    "overview": {
        "title": "Metaverse WebSocket API",
        "version": "1.0.0",
        "description": "Real-time bidirectional communication API for metaverse spaces, supporting user presence, movement, chat, media, and invitations."
    },
    "connection": {
        "endpoint": "/ws/metaverse/space",
        "protocol": "WebSocket (ws:// or wss://)",
        "connection_flow": [
            "1. Connect to WebSocket endpoint",
            "2. Send 'subscribe' event with space_id",
            "3. Receive 'subscribed' confirmation",
            "4. Send 'join' event with user_id and space_id",
            "5. Start receiving and sending events"
        ]
    },
    "client_to_server_events": {
        "subscribe": {
            "description": "Subscribe to a space channel (must be first message)",
            "required": True,
            "format": {
                "event": "subscribe",
                "space_id": "string (UUID)"
            },
            "response": {
                "event": "subscribed",
                "space_id": "string"
            }
        },
        "join": {
            "description": "Join a space as a user",
            "required": True,
            "format": {
                "event": "join",
                "user_id": "string (UUID)",
                "space_id": "string (UUID)",
                "position": {
                    "x": "number (optional, default: 0)",
                    "y": "number (optional, default: 0)",
                    "z": "number (optional)"
                }
            },
            "response": {
                "event": "USER_JOINED",
                "user_id": "string",
                "user": {
                    "id": "string",
                    "user_name": "string",
                    "user_avatar_url": "string",
                    "user_designation": "string"
                },
                "position": {"x": "number", "y": "number", "z": "number"},
                "state": "string (standing/sitting)"
            }
        },
        "move": {
            "description": "Update user position in space",
            "format": {
                "event": "move",
                "position": {
                    "x": "number",
                    "y": "number",
                    "z": "number (optional)"
                }
            },
            "response": {
                "event": "USER_MOVED",
                "user_id": "string",
                "position": {"x": "number", "y": "number", "z": "number"}
            }
        },
        "state_change": {
            "description": "Change user state (standing/sitting)",
            "format": {
                "event": "state_change",
                "state": "string (standing|sitting)"
            },
            "response": {
                "event": "USER_STATE_CHANGED",
                "user_id": "string",
                "old_state": "string",
                "new_state": "string"
            }
        },
        "chat": {
            "description": "Send a chat message to space",
            "format": {
                "event": "chat",
                "message": "string (max 5000 chars)",
                "message_type": "string (space|private)",
                "space_id": "string (required for space messages)",
                "receiver_id": "string (required for private messages)"
            },
            "response": {
                "event": "CHAT_MESSAGE",
                "user_id": "string",
                "user_name": "string",
                "message": "string",
                "message_id": "string",
                "timestamp": "number"
            }
        },
        "private_message": {
            "description": "Send a private message to another user",
            "format": {
                "event": "private_message",
                "receiver_id": "string (UUID)",
                "content": "string (max 5000 chars)"
            },
            "response": {
                "event": "PRIVATE_MESSAGE",
                "from_user_id": "string",
                "from_user_name": "string",
                "message": "string",
                "message_id": "string",
                "timestamp": "number"
            }
        },
        "send_invite": {
            "description": "Send a space invitation to another user",
            "format": {
                "event": "send_invite",
                "to_user_id": "string (UUID)",
                "space_id": "string (UUID)"
            },
            "response": {
                "event": "INVITE_RECEIVED",
                "invite_id": "string",
                "from_user_id": "string",
                "from_user_name": "string",
                "space_id": "string",
                "space_name": "string"
            }
        },
        "accept_invite": {
            "description": "Accept a space invitation",
            "format": {
                "event": "accept_invite",
                "notification_id": "string (UUID)"
            },
            "response": {
                "event": "SPACE_INVITE_ACCEPTED",
                "space_id": "string",
                "space": "object"
            }
        },
        "decline_invite": {
            "description": "Decline a space invitation",
            "format": {
                "event": "decline_invite",
                "notification_id": "string (UUID)"
            },
            "response": {
                "event": "SPACE_INVITE_DECLINED",
                "notification_id": "string"
            }
        },
        "get_users": {
            "description": "Get list of users in a space",
            "format": {
                "event": "get_users",
                "space_id": "string (UUID)"
            },
            "response": {
                "status": "success",
                "data": {
                    "users": "array of user objects",
                    "count": "number"
                }
            }
        },
        "get_invites": {
            "description": "Get user's invitations",
            "format": {
                "event": "get_invites",
                "includeExpired": "boolean (optional, default: false)"
            },
            "response": {
                "status": "success",
                "data": {
                    "invites": "array of invite objects",
                    "count": "number"
                }
            }
        },
        "video_toggle": {
            "description": "Toggle video on/off",
            "format": {
                "event": "video_toggle",
                "enabled": "boolean"
            },
            "response": {
                "event": "VIDEO_TOGGLED",
                "user_id": "string",
                "user_name": "string",
                "video_enabled": "boolean"
            }
        },
        "audio_toggle": {
            "description": "Toggle audio on/off",
            "format": {
                "event": "audio_toggle",
                "enabled": "boolean"
            },
            "response": {
                "event": "AUDIO_TOGGLED",
                "user_id": "string",
                "user_name": "string",
                "audio_enabled": "boolean"
            }
        },
        "leave": {
            "description": "Leave the current space",
            "format": {
                "event": "leave"
            },
            "response": {
                "event": "USER_LEFT",
                "user_id": "string"
            }
        }
    },
    "server_to_client_events": {
        "space_events": {
            "description": "Events broadcast to all users in a space",
            "events": {
                "USER_JOINED": {
                    "description": "A user joined the space",
                    "payload": {
                        "user_id": "string",
                        "user": {
                            "id": "string",
                            "user_name": "string",
                            "user_avatar_url": "string",
                            "user_designation": "string"
                        },
                        "position": {"x": "number", "y": "number", "z": "number"},
                        "state": "string (standing/sitting)"
                    }
                },
                "USER_LEFT": {
                    "description": "A user left the space",
                    "payload": {
                        "user_id": "string"
                    }
                },
                "USER_MOVED": {
                    "description": "A user moved to a new position",
                    "payload": {
                        "user_id": "string",
                        "position": {"x": "number", "y": "number", "z": "number"}
                    }
                },
                "USER_STATE_CHANGED": {
                    "description": "A user changed state (standing/sitting)",
                    "payload": {
                        "user_id": "string",
                        "old_state": "string",
                        "new_state": "string"
                    }
                },
                "CHAT_MESSAGE": {
                    "description": "A chat message was sent in the space",
                    "payload": {
                        "user_id": "string",
                        "user_name": "string",
                        "message": "string",
                        "message_id": "string",
                        "timestamp": "number"
                    }
                },
                "VIDEO_TOGGLED": {
                    "description": "A user toggled their video",
                    "payload": {
                        "user_id": "string",
                        "user_name": "string",
                        "video_enabled": "boolean"
                    }
                },
                "AUDIO_TOGGLED": {
                    "description": "A user toggled their audio",
                    "payload": {
                        "user_id": "string",
                        "user_name": "string",
                        "audio_enabled": "boolean"
                    }
                },
                "USER_ACTION": {
                    "description": "A user performed an action",
                    "payload": {
                        "user_id": "string",
                        "action": "string"
                    }
                },
                "USER_COUNT_CHANGED": {
                    "description": "Number of users in space changed",
                    "payload": {
                        "previous_count": "number",
                        "current_count": "number",
                        "change": "number (+1 or -1)"
                    }
                },
                "SPACE_UPDATED": {
                    "description": "Space configuration was updated",
                    "payload": {
                        "space_id": "string",
                        "updates": "object"
                    }
                }
            }
        },
        "user_events": {
            "description": "Events sent privately to individual users",
            "events": {
                "NOTIFICATION_RECEIVED": {
                    "description": "User received a notification",
                    "payload": {
                        "notification_id": "string",
                        "title": "string",
                        "message": "string",
                        "type": "string",
                        "data": "object (optional)"
                    }
                },
                "PRIVATE_MESSAGE": {
                    "description": "User received a private message",
                    "payload": {
                        "from_user_id": "string",
                        "from_user_name": "string",
                        "message": "string",
                        "message_id": "string",
                        "timestamp": "number"
                    }
                },
                "INVITE_RECEIVED": {
                    "description": "User received a space invitation",
                    "payload": {
                        "invite_id": "string",
                        "from_user_id": "string",
                        "from_user_name": "string",
                        "space_id": "string",
                        "space_name": "string"
                    }
                },
                "SPACE_INVITE_ACCEPTED": {
                    "description": "User's invitation was accepted",
                    "payload": {
                        "space_id": "string",
                        "accepted_by": "string"
                    }
                },
                "SPACE_INVITE_DECLINED": {
                    "description": "User's invitation was declined",
                    "payload": {
                        "space_id": "string",
                        "declined_by": "string"
                    }
                },
                "CONNECTION_STATUS": {
                    "description": "Connection status update",
                    "payload": {
                        "status": "string (connected|disconnected|reconnecting)",
                        "message": "string"
                    }
                },
                "ERROR": {
                    "description": "Error occurred",
                    "payload": {
                        "error": "string",
                        "message": "string",
                        "code": "number (optional)"
                    }
                }
            }
        }
    },
    "error_responses": {
        "format": {
            "event": "error",
            "message": "string (error description)"
        },
        "common_errors": {
            "invalid_message": "Message format is invalid or missing required fields",
            "not_authenticated": "User is not authenticated",
            "access_denied": "User does not have access to the requested space",
            "user_not_found": "User ID not found",
            "space_not_found": "Space ID not found",
            "invalid_event": "Event type is not recognized",
            "subscription_required": "Must subscribe to space before sending events"
        }
    },
    "examples": {
        "connection_flow": [
            {
                "step": "1. Connect and Subscribe",
                "client_sends": {
                    "event": "subscribe",
                    "space_id": "123e4567-e89b-12d3-a456-426614174000"
                },
                "server_responds": {
                    "event": "subscribed",
                    "space_id": "123e4567-e89b-12d3-a456-426614174000"
                }
            },
            {
                "step": "2. Join Space",
                "client_sends": {
                    "event": "join",
                    "user_id": "987fcdeb-51a2-43f7-8c9d-123456789abc",
                    "space_id": "123e4567-e89b-12d3-a456-426614174000",
                    "position": {"x": 100, "y": 200}
                },
                "server_broadcasts": {
                    "event": "USER_JOINED",
                    "user_id": "987fcdeb-51a2-43f7-8c9d-123456789abc",
                    "user": {
                        "id": "987fcdeb-51a2-43f7-8c9d-123456789abc",
                        "user_name": "John Doe",
                        "user_avatar_url": "/avatars/avatar-1.png",
                        "user_designation": "Developer"
                    },
                    "position": {"x": 100, "y": 200},
                    "state": "standing"
                }
            },
            {
                "step": "3. Send Chat Message",
                "client_sends": {
                    "event": "chat",
                    "message": "Hello everyone!",
                    "message_type": "space",
                    "space_id": "123e4567-e89b-12d3-a456-426614174000"
                },
                "server_broadcasts": {
                    "event": "CHAT_MESSAGE",
                    "user_id": "987fcdeb-51a2-43f7-8c9d-123456789abc",
                    "user_name": "John Doe",
                    "message": "Hello everyone!",
                    "message_id": "msg-123",
                    "timestamp": 1699123456.789
                }
            }
        ]
    },
    "authentication": {
        "description": "Users must be authenticated before joining spaces. User access to spaces is validated on join.",
        "requirements": [
            "Valid user_id (UUID format)",
            "User must exist in database",
            "User must have access to the space (validated via database)"
        ]
    },
    "rate_limiting": {
        "note": "Rate limiting may be applied to prevent abuse. Check server configuration for limits."
    },
    "message_reliability": {
        "description": "Messages are cached in Redis (or in-memory fallback) and persisted to database for reliability.",
        "features": [
            "Automatic retry on failure",
            "Message status tracking (pending, validated, cached, broadcast, persisted)",
            "Rollback on broadcast failure"
        ]
    }
}

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