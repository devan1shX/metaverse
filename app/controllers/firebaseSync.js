const UserService = require('../services/UserService');
const { logger } = require('../utils/logger');

const userService = new UserService();

/**
 * Firebase User Sync Controller
 * Syncs a Firebase authenticated user with the PostgreSQL database
 * Creates a new user if doesn't exist, or returns existing user
 */
async function firebaseSyncController(req, res) {
  try {
    const { user_level } = req.body;
    const userLevel = (user_level || 'participant').toLowerCase();

    logger.info('[Firebase Sync] Syncing Firebase user with database', {
      uid: req.firebaseUser.uid,
      email: req.firebaseUser.email?.substring(0, 3) + '***',
      requested_level: userLevel,
    });

    // Sync user with database (find or create)
    const result = await userService.findOrCreateFromFirebase(
      req.firebaseUser,
      userLevel
    );

    if (!result.success) {
      logger.warn('[Firebase Sync] Failed to sync user', {
        errors: result.errors,
      });
      return res.status(400).json({
        success: false,
        message: 'Failed to sync user with database',
        errors: result.errors,
      });
    }

    logger.info('[Firebase Sync] User synced successfully', {
      user_id: result.user.id,
      is_new: result.isNew,
    });

    return res.status(200).json({
      success: true,
      message: result.isNew ? 'User created successfully' : 'User logged in successfully',
      user: result.user.toSafeObject(),
      isNew: result.isNew,
    });
  } catch (error) {
    logger.error('[Firebase Sync] Error in firebaseSyncController', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

module.exports = { firebaseSyncController };
