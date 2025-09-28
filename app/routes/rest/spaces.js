const express = require('express');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const { 
    validateSpaceCreation, 
    validateSpaceUpdate, 
    validateSpaceId, 
    validateSpaceQuery 
} = require('../../middleware/spaceValidation');
const { logger } = require('../../utils/logger');
const {
    createSpace,
    getAllSpaces,
    getSpaceById,
    updateSpace,
    deleteSpace,
    joinSpace,
    leaveSpace,
    getMySpaces
} = require('../../controllers/spaceController');

const router = express.Router();

// Middleware to log space API access
router.use((req, res, next) => {
    logger.info('Space API access', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.user_id
    });
    next();
});

/**
 * @route   POST /spaces
 * @desc    Create a new space
 * @access  Private (authenticated users)
 * @body    { name, description?, isPublic?, maxUsers?, mapType? }
 */
router.post('/', authenticateToken, validateSpaceCreation, createSpace);

/**
 * @route   GET /spaces
 * @desc    Get all spaces with optional filtering
 * @access  Private (authenticated users)
 * @query   { isPublic?, limit?, offset?, search?, adminUserId? }
 */
router.get('/', authenticateToken, validateSpaceQuery, getAllSpaces);

/**
 * @route   GET /spaces/my-spaces
 * @desc    Get current user's spaces
 * @access  Private (authenticated users)
 * @query   { includeInactive? }
 */
router.get('/my-spaces', authenticateToken, getMySpaces);

/**
 * @route   GET /spaces/:spaceId
 * @desc    Get space by ID
 * @access  Private (authenticated users)
 * @query   { includeUsers? }
 */
router.get('/:spaceId', authenticateToken, validateSpaceId, getSpaceById);

/**
 * @route   PUT /spaces/:spaceId
 * @desc    Update space (admin only)
 * @access  Private (space admin or system admin)
 * @body    { name?, description?, isPublic?, maxUsers?, mapType? }
 */
router.put('/:spaceId', authenticateToken, validateSpaceId, validateSpaceUpdate, updateSpace);

/**
 * @route   DELETE /spaces/:spaceId
 * @desc    Delete space (admin only)
 * @access  Private (space admin or system admin)
 */
router.delete('/:spaceId', authenticateToken, validateSpaceId, deleteSpace);

/**
 * @route   POST /spaces/:spaceId/join
 * @desc    Join a space
 * @access  Private (authenticated users)
 */
router.post('/:spaceId/join', authenticateToken, validateSpaceId, joinSpace);

/**
 * @route   POST /spaces/:spaceId/leave
 * @desc    Leave a space
 * @access  Private (authenticated users)
 */
router.post('/:spaceId/leave', authenticateToken, validateSpaceId, leaveSpace);

// Admin-only routes

/**
 * @route   GET /spaces/admin/all
 * @desc    Get all spaces including inactive (admin only)
 * @access  Private (system admin only)
 */
router.get('/admin/all', authenticateToken, requireAdmin, (req, res, next) => {
    // Override query to include inactive spaces
    req.query.includeInactive = 'true';
    getAllSpaces(req, res, next);
});

/**
 * @route   POST /spaces/:spaceId/admin/deactivate
 * @desc    Deactivate a space (admin only)
 * @access  Private (system admin only)
 */
router.post('/:spaceId/admin/deactivate', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { spaceId } = req.params;
        const requesterId = req.user.user_id;

        logger.info('Admin deactivating space', { spaceId, requesterId });

        const SpaceService = require('../../services/SpaceService');
        const result = await SpaceService.deactivateSpace(spaceId, requesterId);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        logger.info('Space deactivated by admin', { spaceId, requesterId });

        return res.status(200).json({
            success: true,
            message: "Space deactivated successfully"
        });

    } catch (error) {
        logger.error('Error in admin deactivate space', { 
            error: error.message, 
            spaceId: req.params.spaceId 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Health check for spaces API
router.get('/health/check', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Spaces API is healthy",
        timestamp: new Date().toISOString(),
        endpoints: {
            create: "POST /spaces",
            list: "GET /spaces",
            mySpaces: "GET /spaces/my-spaces",
            getById: "GET /spaces/:spaceId",
            update: "PUT /spaces/:spaceId",
            delete: "DELETE /spaces/:spaceId",
            join: "POST /spaces/:spaceId/join",
            leave: "POST /spaces/:spaceId/leave"
        }
    });
});

module.exports = router;
