const UserService = require('../services/UserService');
const SpaceService = require('../services/SpaceService');
const NotificationService = require('../services/NotificationService');
const { Config } = require('../config/config');
const redisClient = require('../config/redis_config');
const { get_async_db } = require('../config/db_conn');
const { logger } = require('../utils/logger');

// Use singleton instances (no need to create new instances)
const userService = new UserService();
const spaceService = new SpaceService();
const HEALTH_TIMEOUT_MS = 3500;

function getServiceStatusSummary(services) {
    const values = Object.values(services);
    const healthy = values.filter((service) => service.status === 'healthy').length;
    const degraded = values.filter((service) => service.status === 'degraded').length;
    const unhealthy = values.filter((service) => service.status === 'unhealthy').length;

    let overall = 'healthy';
    if (unhealthy > 0) {
        overall = 'unhealthy';
    } else if (degraded > 0) {
        overall = 'degraded';
    }

    return {
        overall,
        total: values.length,
        healthy,
        degraded,
        unhealthy
    };
}

async function checkDatabaseHealth() {
    const startedAt = Date.now();
    try {
        const pool = await get_async_db();
        const result = await pool.query('SELECT NOW() AS db_time');
        return {
            status: 'healthy',
            latency_ms: Date.now() - startedAt,
            details: {
                connected: true,
                db_time: result.rows?.[0]?.db_time || null
            }
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            latency_ms: Date.now() - startedAt,
            error: error.message,
            details: {
                connected: false
            }
        };
    }
}

async function checkRedisHealth() {
    const startedAt = Date.now();
    try {
        if (!redisClient?.isOpen) {
            return {
                status: 'degraded',
                latency_ms: Date.now() - startedAt,
                error: 'Redis client is not connected',
                details: {
                    connected: false,
                    ready: Boolean(redisClient?.isReady)
                }
            };
        }

        const pingResponse = await redisClient.ping();
        return {
            status: pingResponse === 'PONG' ? 'healthy' : 'degraded',
            latency_ms: Date.now() - startedAt,
            details: {
                connected: true,
                ready: Boolean(redisClient?.isReady),
                ping: pingResponse
            }
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            latency_ms: Date.now() - startedAt,
            error: error.message,
            details: {
                connected: false,
                ready: Boolean(redisClient?.isReady)
            }
        };
    }
}

async function checkHttpJsonService(name, url) {
    const startedAt = Date.now();
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), HEALTH_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'GET',
            signal: abortController.signal
        });

        const textBody = await response.text();
        let parsedBody = null;

        try {
            parsedBody = textBody ? JSON.parse(textBody) : null;
        } catch (parseError) {
            parsedBody = {
                parse_error: parseError.message,
                raw: textBody
            };
        }

        clearTimeout(timeoutHandle);
        const status = response.ok && parsedBody?.success !== false ? 'healthy' : 'unhealthy';

        return {
            service: name,
            status,
            latency_ms: Date.now() - startedAt,
            details: {
                url,
                http_status: response.status,
                response: parsedBody
            }
        };
    } catch (error) {
        clearTimeout(timeoutHandle);
        const isTimeout = error.name === 'AbortError';
        return {
            service: name,
            status: 'unhealthy',
            latency_ms: Date.now() - startedAt,
            error: isTimeout ? `Timeout after ${HEALTH_TIMEOUT_MS}ms` : error.message,
            details: {
                url
            }
        };
    }
}

/**
 * Get user spaces (internal API)
 * GET /internal/users/:userId/spaces
 */
async function getUserSpaces(req, res) {
    try {
        const { userId } = req.params;
        const { includeInactive = false } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        logger.info('[internalController][getUserSpaces] Getting user spaces', { userId, includeInactive });

        // Get user to verify existence
        const userResult = await userService.getUserById(userId);
        if (!userResult.success) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Get spaces for user
        const spacesResult = await spaceService.getSpacesForUser(userId);
        if (!spacesResult.success) {
            return res.status(500).json({
                success: false,
                message: spacesResult.error
            });
        }

        // Filter out inactive spaces unless requested
        let spaces = spacesResult.spaces;
        if (!includeInactive) {
            spaces = spaces.filter(space => space.isActiveSpace());
        }

        // Convert to safe objects
        const safeSpaces = spaces.map(space => space.toSafeObject());

        return res.status(200).json({
            success: true,
            user_id: userId,
            spaces: safeSpaces,
            total_count: safeSpaces.length,
            active_count: spaces.filter(s => s.isActiveSpace()).length
        });

    } catch (error) {
        logger.error('[internalController][getUserSpaces] Error getting user spaces', { 
            error: error.message, 
            stack: error.stack, 
            userId: req.params.userId 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Get user notifications (internal API)
 * GET /internal/users/:userId/notifications
 */
async function getUserNotifications(req, res) {
    try {
        const { userId } = req.params;
        const { 
            type, 
            status, 
            limit = 50, 
            offset = 0,
            includeExpired = false 
        } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        logger.info('[internalController][getUserNotifications] Getting user notifications', { 
            userId, 
            type, 
            status, 
            limit, 
            offset 
        });

        // Get user to verify existence
        const userResult = await userService.getUserById(userId);
        if (!userResult.success) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = userResult.user;
        let notifications = user.notifications || [];

        // Apply filters
        if (type) {
            notifications = notifications.filter(n => n.type === type);
        }

        if (status) {
            notifications = notifications.filter(n => n.status === status);
        }

        if (!includeExpired) {
            notifications = notifications.filter(n => !n.isExpired());
        }

        // Apply pagination
        const totalCount = notifications.length;
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        const paginatedNotifications = notifications.slice(startIndex, endIndex);

        // Convert to safe objects
        const safeNotifications = paginatedNotifications.map(n => n.toSafeObject());

        return res.status(200).json({
            success: true,
            user_id: userId,
            notifications: safeNotifications,
            pagination: {
                total_count: totalCount,
                returned_count: safeNotifications.length,
                limit: parseInt(limit),
                offset: parseInt(offset),
                has_more: endIndex < totalCount
            },
            summary: {
                unread_count: user.getUnreadNotificationsCount(),
                total_active: notifications.filter(n => n.isActiveNotification()).length
            }
        });

    } catch (error) {
        logger.error('[internalController][getUserNotifications] Error getting user notifications', { 
            error: error.message, 
            stack: error.stack, 
            userId: req.params.userId 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Get user status (internal API)
 * GET /internal/users/:userId/status
 */
async function getUserStatus(req, res) {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        logger.info('[internalController][getUserStatus] Getting user status', { userId });

        // Get user
        const userResult = await userService.getUserById(userId);
        if (!userResult.success) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = userResult.user;

        // Get user's spaces
        const spacesResult = await spaceService.getSpacesForUser(userId);
        const activeSpaces = spacesResult.success ? 
            spacesResult.spaces.filter(s => s.isActiveSpace()) : [];

        // Calculate status information
        const status = {
            user_id: userId,
            username: user.username,
            email: user.email,
            role: user.role,
            is_active: user.isActiveUser(),
            is_admin: user.isAdmin(),
            account_status: user.isActiveUser() ? 'active' : 'inactive',
            
            // Space information
            spaces: {
                total_count: user.getSpaceCount(),
                active_count: activeSpaces.length,
                admin_spaces_count: activeSpaces.filter(s => s.isAdmin(userId)).length
            },
            
            // Notification information
            notifications: {
                unread_count: user.getUnreadNotificationsCount(),
                total_count: user.notifications.length,
                active_count: user.notifications.filter(n => n.isActiveNotification()).length
            },
            
            // Account information
            account: {
                created_at: user.createdAt,
                updated_at: user.updatedAt,
                avatar_url: user.avatarUrl,
                designation: user.designation,
                about: user.about
            },
            
            // Current session info (if available from token)
            session: {
                last_activity: new Date().toISOString(),
                is_authenticated: true
            }
        };

        return res.status(200).json({
            success: true,
            status: status,
            retrieved_at: new Date().toISOString()
        });

    } catch (error) {
        logger.error('[internalController][getUserStatus] Error getting user status', { 
            error: error.message, 
            stack: error.stack, 
            userId: req.params.userId 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Get space details (internal API)
 * GET /internal/spaces/:spaceId
 */
async function getSpaceDetails(req, res) {
    try {
        const { spaceId } = req.params;
        const { includeUsers = false } = req.query;

        if (!spaceId) {
            return res.status(400).json({
                success: false,
                message: "Space ID is required"
            });
        }

        logger.info('[internalController][getSpaceDetails] Getting space details', { spaceId, includeUsers });

        const spaceResult = await spaceService.getSpaceById(spaceId);
        if (!spaceResult.success) {
            return res.status(404).json({
                success: false,
                message: "Space not found"
            });
        }

        const space = spaceResult.space;
        let responseData = {
            success: true,
            space: space.toSafeObject(),
            retrieved_at: new Date().toISOString()
        };

        // Include user details if requested
        if (includeUsers === 'true') {
            const userDetails = [];
            for (const userId of space.userIds) {
                const userResult = await userService.getUserSafeData(userId);
                if (userResult.success) {
                    userDetails.push({
                        ...userResult.user,
                        is_admin: space.isAdmin(userId)
                    });
                }
            }
            responseData.users = userDetails;
        }

        return res.status(200).json(responseData);

    } catch (error) {
        logger.error('[internalController][getSpaceDetails] Error getting space details', { 
            error: error.message, 
            stack: error.stack, 
            spaceId: req.params.spaceId 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Get system statistics (internal API)
 * GET /internal/stats
 */
async function getSystemStats(req, res) {
    try {
        logger.info('[internalController][getSystemStats] Getting system statistics');

        // Get all users
        const usersResult = await userService.getAllUsers();
        const users = usersResult.success ? usersResult.users : [];

        // Get all spaces
        const spacesResult = await spaceService.getAllSpaces();
        const spaces = spacesResult.success ? spacesResult.spaces : [];

        const stats = {
            users: {
                total: users.length,
                active: users.filter(u => u.isActiveUser()).length,
                admins: users.filter(u => u.isAdmin()).length,
                participants: users.filter(u => u.role === 'participant').length
            },
            spaces: {
                total: spaces.length,
                active: spaces.filter(s => s.isActiveSpace()).length,
                public: spaces.filter(s => s.isPublic).length,
                private: spaces.filter(s => !s.isPublic).length
            },
            notifications: {
                total_unread: users.reduce((sum, u) => sum + u.getUnreadNotificationsCount(), 0),
                total_notifications: users.reduce((sum, u) => sum + u.notifications.length, 0)
            },
            system: {
                generated_at: new Date().toISOString(),
                uptime: process.uptime(),
                memory_usage: process.memoryUsage()
            }
        };

        return res.status(200).json({
            success: true,
            statistics: stats
        });

    } catch (error) {
        logger.error('[internalController][getSystemStats] Error getting system statistics', { 
            error: error.message, 
            stack: error.stack 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Get consolidated health report for all services
 * GET /internal/health
 */
async function getConsolidatedHealth(req, res) {
    const startedAt = Date.now();
    const backendPort = Config.BackendPort || 3000;
    const backendBaseUrl = `http://127.0.0.1:${backendPort}`;
    const wsHost = process.env.WS_HOST || '127.0.0.1';
    const wsPort = Config.WS_PORT || 5001;
    const wsHealthUrl = `http://${wsHost}:${wsPort}/ws/health`;

    try {
        logger.info('[internalController][getConsolidatedHealth] Getting consolidated health report');

        const [
            database,
            redis,
            spaces_api,
            invites_api,
            notifications_api,
            websocket_api
        ] = await Promise.all([
            checkDatabaseHealth(),
            checkRedisHealth(),
            checkHttpJsonService('spaces_api', `${backendBaseUrl}/metaverse/spaces/health/check`),
            checkHttpJsonService('invites_api', `${backendBaseUrl}/metaverse/invites/health/check`),
            checkHttpJsonService('notifications_api', `${backendBaseUrl}/metaverse/notifications/health/check`),
            checkHttpJsonService('websocket_api', wsHealthUrl)
        ]);

        const backend_api = {
            status: 'healthy',
            latency_ms: 0,
            details: {
                process_uptime_seconds: process.uptime(),
                memory_usage: process.memoryUsage(),
                node_version: process.version,
                pid: process.pid
            }
        };

        const services = {
            backend_api,
            database,
            redis,
            spaces_api,
            invites_api,
            notifications_api,
            websocket_api
        };

        const summary = getServiceStatusSummary(services);
        return res.status(200).json({
            success: summary.overall === 'healthy',
            status: summary.overall,
            message: `Consolidated health report: ${summary.overall}`,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            total_latency_ms: Date.now() - startedAt,
            summary,
            services
        });
    } catch (error) {
        logger.error('[internalController][getConsolidatedHealth] Error getting health report', {
            error: error.message,
            stack: error.stack
        });

        return res.status(500).json({
            success: false,
            status: 'unhealthy',
            message: 'Failed to build consolidated health report',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
}

module.exports = {
    getUserSpaces,
    getUserNotifications,
    getUserStatus,
    getSpaceDetails,
    getSystemStats,
    getConsolidatedHealth
};
