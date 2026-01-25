const express = require('express');
const { logger } = require('../../utils/logger');
const { update_avatar_controller, update_username_controller } = require('../../controllers/userController');
const { verifyFirebaseToken } = require('../../middleware/firebaseAuth');
const UserService = require('../../services/UserService');
const user_routes = express.Router();
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

// Route for PATCH /metaverse/v1/users/:id/avatar
user_routes.patch('/:id/avatar', verifyFirebaseToken, attachDbUser, (req, res) => {
    logger.info('Update avatar route accessed', { userId: req.params.id });
    update_avatar_controller(req, res);
});

// Route for PATCH /metaverse/v1/users/:id/username
user_routes.patch('/:id/username', verifyFirebaseToken, attachDbUser, (req, res) => {
    logger.info('Update username route accessed', { userId: req.params.id });
    update_username_controller(req, res);
});

module.exports = { user_routes };