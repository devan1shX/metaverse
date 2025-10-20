const { logger } = require('../utils/logger');
const InviteService = require('../services/InviteService');

/**
 * @route   POST /metaverse/invites/send
 * @desc    Send an invite to a user for a space
 * @access  Private (authenticated users)
 */
async function sendInvite(req, res) {
    try {
        const fromUserId = req.user.user_id;
        const { toUserId, spaceId } = req.body;

        if (!toUserId || !spaceId) {
            return res.status(400).json({
                success: false,
                error: 'toUserId and spaceId are required'
            });
        }

        const result = await InviteService.sendInvite(fromUserId, toUserId, spaceId);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }

    } catch (error) {
        logger.error('Error in sendInvite controller', { 
            error: error.message, 
            userId: req.user?.user_id 
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * @route   POST /metaverse/invites/:notificationId/accept
 * @desc    Accept a space invite
 * @access  Private (authenticated users)
 */
async function acceptInvite(req, res) {
    try {
        const userId = req.user.user_id;
        const { notificationId } = req.params;

        if (!notificationId) {
            return res.status(400).json({
                success: false,
                error: 'notificationId is required'
            });
        }

        const result = await InviteService.acceptInvite(userId, notificationId);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }

    } catch (error) {
        logger.error('Error in acceptInvite controller', { 
            error: error.message, 
            userId: req.user?.user_id,
            notificationId: req.params.notificationId
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * @route   POST /metaverse/invites/:notificationId/decline
 * @desc    Decline a space invite
 * @access  Private (authenticated users)
 */
async function declineInvite(req, res) {
    try {
        const userId = req.user.user_id;
        const { notificationId } = req.params;

        if (!notificationId) {
            return res.status(400).json({
                success: false,
                error: 'notificationId is required'
            });
        }

        const result = await InviteService.declineInvite(userId, notificationId);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }

    } catch (error) {
        logger.error('Error in declineInvite controller', { 
            error: error.message, 
            userId: req.user?.user_id,
            notificationId: req.params.notificationId
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * @route   GET /metaverse/invites/users/:spaceId
 * @desc    Get list of users that can be invited to a space
 * @access  Private (authenticated users)
 */
async function getInvitableUsers(req, res) {
    try {
        const requestingUserId = req.user.user_id;
        const { spaceId } = req.params;

        if (!spaceId) {
            return res.status(400).json({
                success: false,
                error: 'spaceId is required'
            });
        }

        const result = await InviteService.getInvitableUsers(requestingUserId, spaceId);

        return res.status(200).json(result);

    } catch (error) {
        logger.error('Error in getInvitableUsers controller', { 
            error: error.message, 
            userId: req.user?.user_id,
            spaceId: req.params.spaceId
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

/**
 * @route   GET /metaverse/invites/my-invites
 * @desc    Get current user's invites
 * @access  Private (authenticated users)
 */
async function getMyInvites(req, res) {
    try {
        const userId = req.user.user_id;
        const includeExpired = req.query.includeExpired === 'true';

        const result = await InviteService.getUserInvites(userId, includeExpired);

        return res.status(200).json(result);

    } catch (error) {
        logger.error('Error in getMyInvites controller', { 
            error: error.message, 
            userId: req.user?.user_id
        });
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

module.exports = {
    sendInvite,
    acceptInvite,
    declineInvite,
    getInvitableUsers,
    getMyInvites
};

