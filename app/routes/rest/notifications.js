const express = require('express');
const { verifyAuthToken, attachDbUser } = require('../../middleware/firebaseAuth');
const { logger } = require('../../utils/logger');
const notificationService = require('../../services/NotificationService');
const {
    getAllNotifications,
    getNotificationById,
    updateNotification,
    deleteNotification,
    markAsRead,
    markAsUnread,
    dismissNotification,
    getUserNotifications
} = require('../../controllers/notificationController');

const router = express.Router();

// Middleware to log notification API access
router.use((req, res, next) => {
    logger.info('Notification API access', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.user_id
    });
    next();
});

/**
 * @route   GET /notifications
 * @desc    Get all notifications for current user
 * @access  Private (authenticated users)
 * @query   { type?, status?, limit?, offset?, includeExpired? }
 */
router.get('/', verifyAuthToken, attachDbUser, getUserNotifications);

/**
 * @route   GET /notifications/:notificationId
 * @desc    Get notification by ID
 * @access  Private (authenticated users)
 */
router.get('/:notificationId', verifyAuthToken, attachDbUser, getNotificationById);

/**
 * @route   PUT /notifications/:notificationId
 * @desc    Update notification (admin only)
 * @access  Private (system admin only)
 * @body    { title?, message?, status?, isActive? }
 */
router.put('/:notificationId', verifyAuthToken, attachDbUser, (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    updateNotification(req, res, next);
});

/**
 * @route   DELETE /notifications/:notificationId
 * @desc    Delete notification (admin only)
 * @access  Private (system admin only)
 */
router.delete('/:notificationId', verifyAuthToken, attachDbUser, (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    deleteNotification(req, res, next);
});

/**
 * @route   POST /notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private (authenticated users)
 */
router.post('/:notificationId/read', verifyAuthToken, attachDbUser, markAsRead);

/**
 * @route   POST /notifications/:notificationId/unread
 * @desc    Mark notification as unread
 * @access  Private (authenticated users)
 */
router.post('/:notificationId/unread', verifyAuthToken, attachDbUser, markAsUnread);

/**
 * @route   POST /notifications/:notificationId/dismiss
 * @desc    Dismiss notification
 * @access  Private (authenticated users)
 */
router.post('/:notificationId/dismiss', verifyAuthToken, attachDbUser, dismissNotification);

// Admin-only routes

/**
 * @route   GET /notifications/admin/all
 * @desc    Get all notifications (admin only)
 * @access  Private (system admin only)
 * @query   { userId?, type?, status?, limit?, offset? }
 */
router.get('/admin/all', verifyAuthToken, attachDbUser, (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    getAllNotifications(req, res, next);
});

/**
 * @route   POST /notifications/admin/bulk-update
 * @desc    Bulk update notifications (admin only)
 * @access  Private (system admin only)
 * @body    { notificationIds: string[], updates: object }
 */
router.post('/admin/bulk-update', verifyAuthToken, attachDbUser, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    try {
        const { notificationIds, updates } = req.body;
        const requesterId = req.user.user_id;

        logger.info('Admin bulk updating notifications', { 
            notificationIds, 
            updates, 
            requesterId 
        });

        const NotificationService = require('../../services/NotificationService');
        const result = await notificationService.bulkUpdateNotifications( // Call method on the instance
            notificationIds, 
            updates, 
            requesterId
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        logger.info('Notifications bulk updated by admin', { 
            count: notificationIds.length, 
            requesterId 
        });

        return res.status(200).json({
            success: true,
            message: "Notifications updated successfully",
            updatedCount: result.updatedCount
        });

    } catch (error) {
        logger.error('Error in admin bulk update notifications', { 
            error: error.message, 
            stack: error.stack
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

/**
 * @route   POST /notifications/admin/bulk-delete
 * @desc    Bulk delete notifications (admin only)
 * @access  Private (system admin only)
 * @body    { notificationIds: string[] }
 */
router.post('/admin/bulk-delete', verifyAuthToken, attachDbUser, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    try {
        const { notificationIds } = req.body;
        const requesterId = req.user.user_id;

        logger.info('Admin bulk deleting notifications', { 
            notificationIds, 
            requesterId 
        });

        const NotificationService = require('../../services/NotificationService');
        const result = await NotificationService.bulkDeleteNotifications(
            notificationIds, 
            requesterId
        );

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        logger.info('Notifications bulk deleted by admin', { 
            count: notificationIds.length, 
            requesterId 
        });

        return res.status(200).json({
            success: true,
            message: "Notifications deleted successfully",
            deletedCount: result.deletedCount
        });

    } catch (error) {
        logger.error('Error in admin bulk delete notifications', { 
            error: error.message, 
            stack: error.stack
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Health check for notifications API
router.get('/health/check', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Notifications API is healthy",
        timestamp: new Date().toISOString(),
        endpoints: {
            getUserNotifications: "GET /notifications",
            getById: "GET /notifications/:notificationId",
            update: "PUT /notifications/:notificationId",
            delete: "DELETE /notifications/:notificationId",
            markAsRead: "POST /notifications/:notificationId/read",
            markAsUnread: "POST /notifications/:notificationId/unread",
            dismiss: "POST /notifications/:notificationId/dismiss",
            adminAll: "GET /notifications/admin/all",
            adminBulkUpdate: "POST /notifications/admin/bulk-update",
            adminBulkDelete: "POST /notifications/admin/bulk-delete"
        }
    });
});

module.exports = router;
