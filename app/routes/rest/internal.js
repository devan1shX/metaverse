const express = require('express');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const { logger } = require('../../utils/logger');
const {
    getUserSpaces,
    getUserNotifications,
    getUserStatus,
    getSpaceDetails,
    getSystemStats
} = require('../../controllers/internalController');

const router = express.Router();

// Middleware to log internal API access
router.use((req, res, next) => {
    logger.info('Internal API access', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next();
});

// User-related internal APIs
router.get('/api/users/:userId/spaces', authenticateToken, getUserSpaces);
router.get('/api/users/:userId/notifications', authenticateToken, getUserNotifications);
router.get('/api/users/:userId/status', authenticateToken, getUserStatus);

// Space-related internal APIs
router.get('/api/spaces/:spaceId', authenticateToken, getSpaceDetails);

// System statistics (admin only)
router.get('/api/stats', authenticateToken, requireAdmin, getSystemStats);

// Health check endpoint
router.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Internal API is healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;
