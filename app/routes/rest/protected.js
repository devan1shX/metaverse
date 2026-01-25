const express = require('express');
const { verifyFirebaseToken } = require('../../middleware/firebaseAuth');
const UserService = require('../../services/UserService');
const { logger } = require('../../utils/logger');

const router = express.Router();
const userService = new UserService();

/**
 * Helper middleware to get PostgreSQL user from Firebase UID
 * Attaches req.dbUser after Firebase verification
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

// Protected route - requires valid Firebase token
router.get('/profile', verifyFirebaseToken, attachDbUser, (req, res) => {
    try {
        logger.info('Profile access', { user_id: req.user.user_id });
        
        res.status(200).json({
            message: 'Profile data retrieved successfully',
            user: {
                id: req.user.user_id,
                email: req.user.email,
                username: req.user.username,
                role: req.user.role
            }
        });
    } catch (error) {
        logger.error('Profile access error', { error: error.message });
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Admin only route
router.get('/admin/users', verifyFirebaseToken, attachDbUser, (req, res) => {
    // Check admin role
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    try {
        logger.info('Admin users list access', { admin_id: req.user.user_id });
        
        // In a real application, you would fetch users from database
        res.status(200).json({
            message: 'Users list retrieved successfully',
            note: 'This is an admin-only endpoint',
            admin: req.user.username
        });
    } catch (error) {
        logger.error('Admin users access error', { error: error.message });
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Participant route (accessible by participants and admins)
router.get('/game/status', verifyFirebaseToken, attachDbUser, (req, res) => {
    // Check role
    if (req.user.role !== 'participant' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Participant access required.' });
    }
    try {
        logger.info('Game status access', { user_id: req.user.user_id });
        
        res.status(200).json({
            message: 'Game status retrieved successfully',
            game_status: 'active',
            user_role: req.user.role,
            online_players: 42
        });
    } catch (error) {
        logger.error('Game status access error', { error: error.message });
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
