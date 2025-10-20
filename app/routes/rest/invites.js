const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const { logger } = require('../../utils/logger');
const {
    sendInvite,
    acceptInvite,
    declineInvite,
    getInvitableUsers,
    getMyInvites
} = require('../../controllers/inviteController');

const router = express.Router();

// Middleware to log invite API access
router.use((req, res, next) => {
    logger.info('Invite API access', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.user_id
    });
    next();
});

/**
 * @route   POST /invites/send
 * @desc    Send an invite to a user for a space
 * @access  Private (authenticated users)
 * @body    { toUserId, spaceId }
 */
router.post('/send', authenticateToken, sendInvite);

/**
 * @route   POST /invites/:notificationId/accept
 * @desc    Accept a space invite
 * @access  Private (authenticated users)
 */
router.post('/:notificationId/accept', authenticateToken, acceptInvite);

/**
 * @route   POST /invites/:notificationId/decline
 * @desc    Decline a space invite
 * @access  Private (authenticated users)
 */
router.post('/:notificationId/decline', authenticateToken, declineInvite);

/**
 * @route   GET /invites/users/:spaceId
 * @desc    Get list of users that can be invited to a space
 * @access  Private (authenticated users)
 */
router.get('/users/:spaceId', authenticateToken, getInvitableUsers);

/**
 * @route   GET /invites/my-invites
 * @desc    Get current user's invites
 * @access  Private (authenticated users)
 * @query   { includeExpired? }
 */
router.get('/my-invites', authenticateToken, getMyInvites);

// Health check for invites API
router.get('/health/check', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Invites API is healthy",
        timestamp: new Date().toISOString(),
        endpoints: {
            send: "POST /invites/send",
            accept: "POST /invites/:notificationId/accept",
            decline: "POST /invites/:notificationId/decline",
            getUsers: "GET /invites/users/:spaceId",
            myInvites: "GET /invites/my-invites"
        }
    });
});

module.exports = router;

