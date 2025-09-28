const express = require('express');
const { authenticateToken, requireAdmin, requireParticipant } = require('../../middleware/auth');
const { logger } = require('../../utils/logger');

const router = express.Router();

// Protected route - requires valid JWT token
router.get('/profile', authenticateToken, (req, res) => {
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
router.get('/admin/users', authenticateToken, requireAdmin, (req, res) => {
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
router.get('/game/status', authenticateToken, requireParticipant, (req, res) => {
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
