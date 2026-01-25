const express = require('express');
const { verifyFirebaseToken } = require('../../middleware/firebaseAuth');
const UserService = require('../../services/UserService');
const { logger } = require('../../utils/logger');
const {
    getUserSpaces,
    getUserNotifications,
    getUserStatus,
    getSpaceDetails,
    getSystemStats
} = require('../../controllers/internalController');

const router = express.Router();
const userService = new UserService();

/**
 * Helper middleware to get PostgreSQL user from Firebase email
 */
async function attachDbUser(req, res, next) {
  try {
    const result = await userService.getUserByEmail(req.firebaseUser.email);
    if (!result.success || !result.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database',
      });
    }
    req.dbUser = result.user;
    req.user = {
      user_id: result.user.id,
      email: result.user.email,
      username: result.user.username,
      role: result.user.role,
    };
    next();
  } catch (error) {
    logger.error('[attachDbUser] Error fetching database user', {
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user data',
    });
  }
}

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
router.get('/api/users/:userId/spaces', verifyFirebaseToken, attachDbUser, getUserSpaces);
router.get('/api/users/:userId/notifications', verifyFirebaseToken, attachDbUser, getUserNotifications);
router.get('/api/users/:userId/status', verifyFirebaseToken, attachDbUser, getUserStatus);

// Space-related internal APIs
router.get('/api/spaces/:spaceId', verifyFirebaseToken, attachDbUser, getSpaceDetails);

// System statistics (admin only)
router.get('/api/stats', verifyFirebaseToken, attachDbUser, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  getSystemStats(req, res, next);
});

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
