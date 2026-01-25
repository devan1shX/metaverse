const express = require('express');
const { verifyFirebaseToken } = require('../../middleware/firebaseAuth');
const UserService = require('../../services/UserService');
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
const SpaceService = require('../../services/SpaceService');




const router = express.Router();

const spaceService = new SpaceService();
const userService = new UserService();

/**
 * Helper middleware to get PostgreSQL user from Firebase email
 * Attaches req.dbUser and req.user after Firebase verification
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
router.post('/', verifyFirebaseToken, attachDbUser, validateSpaceCreation, createSpace);

/**
 * @route   GET /spaces
 * @desc    Get all spaces with optional filtering
 * @access  Private (authenticated users)
 * @query   { isPublic?, limit?, offset?, search?, adminUserId? }
 */
router.get('/', verifyFirebaseToken, attachDbUser, validateSpaceQuery, getAllSpaces);

/**
 * @route   GET /spaces/my-spaces
 * @desc    Get current user's spaces
 * @access  Private (authenticated users)
 * @query   { includeInactive? }
 */
router.get('/my-spaces', verifyFirebaseToken, attachDbUser, getMySpaces);

/**
 * @route   GET /spaces/:spaceId
 * @desc    Get space by ID with complete database row and all users
 * @access  Private (authenticated users)
 */
router.get('/:spaceId', verifyFirebaseToken, attachDbUser, validateSpaceId, getSpaceById);

/**
 * @route   PUT /spaces/:spaceId
 * @desc    Update space (admin only)
 * @access  Private (space admin or system admin)
 * @body    { name?, description?, isPublic?, maxUsers?, mapType? }
 */
router.put('/:spaceId', verifyFirebaseToken, attachDbUser, validateSpaceId, validateSpaceUpdate, updateSpace);

/**
 * @route   DELETE /spaces/:spaceId
 * @desc    Delete space (admin only)
 * @access  Private (space admin or system admin)
 */
router.delete('/:spaceId', verifyFirebaseToken, attachDbUser, validateSpaceId, deleteSpace);

/**
 * @route   POST /spaces/:spaceId/join
 * @desc    Join a space
 * @access  Private (authenticated users)
 */
router.post('/:spaceId/join', verifyFirebaseToken, attachDbUser, validateSpaceId, joinSpace);

/**
 * @route   POST /spaces/:spaceId/leave
 * @desc    Leave a space
 * @access  Private (authenticated users)
 */
router.post('/:spaceId/leave', verifyFirebaseToken, attachDbUser, validateSpaceId, leaveSpace);

// Admin-only routes

/**
 * @route   GET /spaces/admin/all
 * @desc    Get all spaces including inactive (admin only)
 * @access  Private (system admin only)
 */
router.get('/admin/all', verifyFirebaseToken, attachDbUser, (req, res, next) => {
    // Check admin role
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    // Override query to include inactive spaces
    req.query.includeInactive = 'true';
    getAllSpaces(req, res, next);
});

/**
 * @route   POST /spaces/:spaceId/admin/deactivate
 * @desc    Deactivate a space (admin only)
 * @access  Private (system admin only)
 */
router.post('/:spaceId/admin/deactivate', verifyFirebaseToken, attachDbUser, async (req, res) => {
    // Check admin role
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    try {
        const { spaceId } = req.params;
        const requesterId = req.user.user_id;

        logger.info('Admin deactivating space', { spaceId, requesterId });

        const SpaceService = require('../../services/SpaceService');
        const result = await spaceService.deactivateSpace(spaceId, requesterId); // Call on the instance

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
