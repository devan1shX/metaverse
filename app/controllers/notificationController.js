const { logger } = require('../utils/logger');
const NotificationService = require('../services/NotificationService');

/**
 * Get all notifications for current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function getUserNotifications(req, res, next) {
    try {
        const userId = req.user.user_id;
        const { 
            type, 
            status, 
            limit = 50, 
            offset = 0, 
            includeExpired = false 
        } = req.query;

        logger.info('Getting user notifications', { 
            userId, 
            type, 
            status, 
            limit, 
            offset, 
            includeExpired 
        });

        const result = await NotificationService.getUserNotifications(
            userId, 
            { type, status, limit: parseInt(limit), offset: parseInt(offset), includeExpired }
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        logger.info('User notifications retrieved successfully', { 
            userId, 
            count: result.notifications.length 
        });

        return res.status(200).json({
            success: true,
            message: "Notifications retrieved successfully",
            notifications: result.notifications,
            totalCount: result.totalCount,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: result.hasMore
            }
        });

    } catch (error) {
        logger.error('Error in getUserNotifications', { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.user_id
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Get notification by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function getNotificationById(req, res, next) {
    try {
        const { notificationId } = req.params;
        const userId = req.user.user_id;

        logger.info('Getting notification by ID', { notificationId, userId });

        const result = await NotificationService.getNotificationById(notificationId, userId);

        if (!result.success) {
            const statusCode = result.error === 'Notification not found' ? 404 : 400;
            return res.status(statusCode).json({
                success: false,
                message: result.error
            });
        }

        logger.info('Notification retrieved successfully', { notificationId, userId });

        return res.status(200).json({
            success: true,
            message: "Notification retrieved successfully",
            notification: result.notification
        });

    } catch (error) {
        logger.error('Error in getNotificationById', { 
            error: error.message, 
            stack: error.stack,
            notificationId: req.params.notificationId,
            userId: req.user?.user_id
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Update notification (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function updateNotification(req, res, next) {
    try {
        const { notificationId } = req.params;
        const { title, message, status, isActive } = req.body;
        const requesterId = req.user.user_id;

        logger.info('Updating notification', { 
            notificationId, 
            requesterId, 
            updates: { title, message, status, isActive }
        });

        const result = await NotificationService.updateNotification(
            notificationId, 
            { title, message, status, isActive }, 
            requesterId
        );

        if (!result.success) {
            const statusCode = result.error === 'Notification not found' ? 404 : 400;
            return res.status(statusCode).json({
                success: false,
                message: result.error
            });
        }

        logger.info('Notification updated successfully', { notificationId, requesterId });

        return res.status(200).json({
            success: true,
            message: "Notification updated successfully",
            notification: result.notification
        });

    } catch (error) {
        logger.error('Error in updateNotification', { 
            error: error.message, 
            stack: error.stack,
            notificationId: req.params.notificationId,
            requesterId: req.user?.user_id
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Delete notification (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function deleteNotification(req, res, next) {
    try {
        const { notificationId } = req.params;
        const requesterId = req.user.user_id;

        logger.info('Deleting notification', { notificationId, requesterId });

        const result = await NotificationService.deleteNotification(notificationId, requesterId);

        if (!result.success) {
            const statusCode = result.error === 'Notification not found' ? 404 : 400;
            return res.status(statusCode).json({
                success: false,
                message: result.error
            });
        }

        logger.info('Notification deleted successfully', { notificationId, requesterId });

        return res.status(200).json({
            success: true,
            message: "Notification deleted successfully"
        });

    } catch (error) {
        logger.error('Error in deleteNotification', { 
            error: error.message, 
            stack: error.stack,
            notificationId: req.params.notificationId,
            requesterId: req.user?.user_id
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Mark notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function markAsRead(req, res, next) {
    try {
        const { notificationId } = req.params;
        const userId = req.user.user_id;

        logger.info('Marking notification as read', { notificationId, userId });

        const result = await NotificationService.markAsRead(notificationId, userId);

        if (!result.success) {
            const statusCode = result.error === 'Notification not found' ? 404 : 400;
            return res.status(statusCode).json({
                success: false,
                message: result.error
            });
        }

        logger.info('Notification marked as read', { notificationId, userId });

        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
            notification: result.notification
        });

    } catch (error) {
        logger.error('Error in markAsRead', { 
            error: error.message, 
            stack: error.stack,
            notificationId: req.params.notificationId,
            userId: req.user?.user_id
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Mark notification as unread
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function markAsUnread(req, res, next) {
    try {
        const { notificationId } = req.params;
        const userId = req.user.user_id;

        logger.info('Marking notification as unread', { notificationId, userId });

        const result = await NotificationService.markAsUnread(notificationId, userId);

        if (!result.success) {
            const statusCode = result.error === 'Notification not found' ? 404 : 400;
            return res.status(statusCode).json({
                success: false,
                message: result.error
            });
        }

        logger.info('Notification marked as unread', { notificationId, userId });

        return res.status(200).json({
            success: true,
            message: "Notification marked as unread",
            notification: result.notification
        });

    } catch (error) {
        logger.error('Error in markAsUnread', { 
            error: error.message, 
            stack: error.stack,
            notificationId: req.params.notificationId,
            userId: req.user?.user_id
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Dismiss notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function dismissNotification(req, res, next) {
    try {
        const { notificationId } = req.params;
        const userId = req.user.user_id;

        logger.info('Dismissing notification', { notificationId, userId });

        const result = await NotificationService.dismissNotification(notificationId, userId);

        if (!result.success) {
            const statusCode = result.error === 'Notification not found' ? 404 : 400;
            return res.status(statusCode).json({
                success: false,
                message: result.error
            });
        }

        logger.info('Notification dismissed', { notificationId, userId });

        return res.status(200).json({
            success: true,
            message: "Notification dismissed",
            notification: result.notification
        });

    } catch (error) {
        logger.error('Error in dismissNotification', { 
            error: error.message, 
            stack: error.stack,
            notificationId: req.params.notificationId,
            userId: req.user?.user_id
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Get all notifications (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function getAllNotifications(req, res, next) {
    try {
        const { 
            userId, 
            type, 
            status, 
            limit = 50, 
            offset = 0 
        } = req.query;
        const requesterId = req.user.user_id;

        logger.info('Admin getting all notifications', { 
            requesterId, 
            filters: { userId, type, status, limit, offset }
        });

        const result = await NotificationService.getAllNotifications(
            { userId, type, status, limit: parseInt(limit), offset: parseInt(offset) },
            requesterId
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        logger.info('All notifications retrieved by admin', { 
            requesterId, 
            count: result.notifications.length 
        });

        return res.status(200).json({
            success: true,
            message: "All notifications retrieved successfully",
            notifications: result.notifications,
            totalCount: result.totalCount,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: result.hasMore
            }
        });

    } catch (error) {
        logger.error('Error in getAllNotifications', { 
            error: error.message, 
            stack: error.stack,
            requesterId: req.user?.user_id
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = {
    getUserNotifications,
    getNotificationById,
    updateNotification,
    deleteNotification,
    markAsRead,
    markAsUnread,
    dismissNotification,
    getAllNotifications
};
