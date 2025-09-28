const UserService = require('../services/UserService');
const SpaceService = require('../services/SpaceService');
const NotificationService = require('../services/NotificationService');
const { logger } = require('../utils/logger');

// Use singleton instances (no need to create new instances)
const userService = UserService;
const spaceService = SpaceService;
const notificationService = NotificationService;

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

        logger.info('Getting user spaces', { userId, includeInactive });

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
        logger.error('Error getting user spaces', { 
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

        logger.info('Getting user notifications', { 
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
        logger.error('Error getting user notifications', { 
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

        logger.info('Getting user status', { userId });

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
        logger.error('Error getting user status', { 
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

        logger.info('Getting space details', { spaceId, includeUsers });

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
        logger.error('Error getting space details', { 
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
        logger.info('Getting system statistics');

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
        logger.error('Error getting system statistics', { 
            error: error.message, 
            stack: error.stack 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = {
    getUserSpaces,
    getUserNotifications,
    getUserStatus,
    getSpaceDetails,
    getSystemStats
};
