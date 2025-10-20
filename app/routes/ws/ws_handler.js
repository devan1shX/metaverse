const { WebSocketServer } = require('ws');
const { logger } = require('../../utils/logger');
const WSMessageParser = require('../../utils/wsMsgParser.js');
const { Config } = require('../../config/config');


class WebSocketManager {
    constructor() {
        this.wss = new WebSocketServer({ port: Config.WS_PORT });
        this.connections = new Map(); // ws -> {userId, spaceId, isAuthenticated}
        this.spaceConnections = new Map(); // spaceId -> Set of ws connections
        this.userConnections = new Map(); // userId -> ws connection
        this.setupWebSocketServer();
    }

    setupWebSocketServer() {
        this.wss.on('connection', (ws) => {
            logger.info('Client connected');
            
            // Initialize connection metadata
            this.connections.set(ws, {
                userId: null,
                spaceId: null,
                isAuthenticated: false
            });

            ws.on('message', async (message) => {
                try {
                    const messageStr = message.toString();
                    logger.info('[ws_handler][message][Message received:', JSON.parse(messageStr));
                    
                    // Process message through WSMessageParser
                    const result = await WSMessageParser.HandleClientMessage(messageStr);
                    
                    // Send response back to sender
                    if (result) {
                        ws.send(JSON.stringify(result));
                        
                        // Handle broadcasting for successful join space
                        if (result.status === "success" && result.message === "Join space successful") {
                            this.handleUserJoinedSpace(ws, result.data);
                        }
                    }
                } catch (error) {
                    logger.error('[ws_handler][message][Error processing WebSocket message', { 
                        error: error.message, 
                        stack: error.stack 
                    });
                    
                    ws.send(JSON.stringify({
                        status: "failed",
                        error: "Failed to process message"
                    }));
                }
            });

            ws.on('close', () => {
                this.handleClientDisconnect(ws);
            });

            ws.on('error', (error) => {
                logger.error('WebSocket error', { error: error.message });
                this.handleClientDisconnect(ws);
            });
        });
    }

    handleUserJoinedSpace(ws, data) {
        const { user, space, position } = data;
        
        if (!user || !space) {
            logger.warn('Invalid join space data for broadcasting', { data });
            return;
        }

        const userId = user.id;
        const spaceId = space.id;

        // Update connection metadata
        const connectionInfo = this.connections.get(ws);
        if (connectionInfo) {
            connectionInfo.userId = userId;
            connectionInfo.spaceId = spaceId;
            connectionInfo.isAuthenticated = true;
        }

        // Add to space connections
        if (!this.spaceConnections.has(spaceId)) {
            this.spaceConnections.set(spaceId, new Set());
        }
        this.spaceConnections.get(spaceId).add(ws);

        // Add to user connections
        this.userConnections.set(userId, ws);

        // Broadcast to all other users in the same space
        this.broadcastToSpace(spaceId, {
            type: Config.WS_BROADCAST_EVENTS.USER_JOINED,
            payload: {
                user: {
                    id: user.id,
                    username: user.username,
                    avatarUrl: user.avatarUrl
                },
                spaceId: spaceId,
                position: position,
                timestamp: new Date().toISOString()
            }
        }, ws); // Exclude the joining user

        logger.info('User join broadcasted to space', { userId, spaceId, position });
    }

    handleClientDisconnect(ws) {
        const connectionInfo = this.connections.get(ws);
        
        if (connectionInfo && connectionInfo.isAuthenticated) {
            const { userId, spaceId } = connectionInfo;
            
            // Remove from space connections
            if (this.spaceConnections.has(spaceId)) {
                this.spaceConnections.get(spaceId).delete(ws);
                if (this.spaceConnections.get(spaceId).size === 0) {
                    this.spaceConnections.delete(spaceId);
                }
            }

            // Remove from user connections
            this.userConnections.delete(userId);

            // Broadcast user left to space
            if (spaceId) {
                this.broadcastToSpace(spaceId, {
                    type: Config.WS_BROADCAST_EVENTS.USER_LEFT,
                    payload: {
                        userId: userId,
                        spaceId: spaceId,
                        timestamp: new Date().toISOString()
                    }
                });
            }

            logger.info('User disconnected and removed from space', { userId, spaceId });
        }

        // Clean up connection
        this.connections.delete(ws);
        logger.info('WebSocket closed');
    }

    broadcastToSpace(spaceId, message, excludeWs = null) {
        const spaceConnections = this.spaceConnections.get(spaceId);
        
        if (!spaceConnections) {
            logger.debug('No connections found for space', { spaceId });
            return;
        }

        const messageStr = JSON.stringify(message);
        let broadcastCount = 0;

        spaceConnections.forEach((ws) => {
            if (ws !== excludeWs && ws.readyState === ws.OPEN) {
                try {
                    ws.send(messageStr);
                    broadcastCount++;
                } catch (error) {
                    logger.error('Error broadcasting to client', { error: error.message });
                    // Remove dead connection
                    spaceConnections.delete(ws);
                    this.connections.delete(ws);
                }
            }
        });

        logger.debug('Message broadcasted to space', { 
            spaceId, 
            broadcastCount, 
            messageType: message.type 
        });
    }

    broadcastToUser(userId, message) {
        const ws = this.userConnections.get(userId);
        
        if (ws && ws.readyState === ws.OPEN) {
            try {
                ws.send(JSON.stringify(message));
                logger.debug('Message sent to user', { userId, messageType: message.type });
                return true;
            } catch (error) {
                logger.error('Error sending message to user', { userId, error: error.message });
                // Clean up dead connection
                this.userConnections.delete(userId);
                this.connections.delete(ws);
                return false;
            }
        }
        
        logger.debug('User not connected or connection not ready', { userId });
        return false;
    }

    getSpaceUserCount(spaceId) {
        const spaceConnections = this.spaceConnections.get(spaceId);
        return spaceConnections ? spaceConnections.size : 0;
    }

    getConnectedUsers() {
        return Array.from(this.userConnections.keys());
    }

    getWebSocketServer() {
        return this.wss;
    }
}

// Create singleton instance
const wsManager = new WebSocketManager();

module.exports = wsManager;
