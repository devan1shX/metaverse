// Legacy DAL - Updated to use new class-based architecture
// This file maintains backward compatibility while using the new UserService

const UserService = require('../services/UserService');
const { logger } = require('../utils/logger');

// Use UserService singleton instance
const userService = UserService;
/**
 * Legacy function: Create user
 * @deprecated Use UserService.createUser() directly for new code
 */
async function createUser({ username, email, password }) {
  try {
    logger.debug('Legacy createUser called', { username, email });
    
    const result = await userService.createUser({
      username,
      email,
      password
    });

    if (result.success) {
      // Return database row format for backward compatibility
      return result.user.toDatabaseObject();
    } else {
      const error = new Error(result.errors ? result.errors.join(', ') : 'Failed to create user');
      throw error;
    }
  } catch (error) {
    logger.error('Error in legacy createUser', { error: error.message, stack: error.stack, username, email });
    throw error;
  }
}

/**
 * Legacy function: Get user by ID
 * @deprecated Use UserService.getUserById() directly for new code
 */
async function getUserById(id) {
  try {
    logger.debug('Legacy getUserById called', { user_id: id });
    
    const result = await userService.getUserById(id);
    
    if (result.success) {
      // Return database row format for backward compatibility
      return result.user.toDatabaseObject();
    } else {
      return null; // Legacy behavior - return null if not found
    }
  } catch (error) {
    logger.error('Error in legacy getUserById', { error: error.message, stack: error.stack, user_id: id });
    throw error;
  }
}

/**
 * Legacy function: Get all users
 * @deprecated Use UserService.getAllUsers() directly for new code
 */
async function getAllUsers() {
  try {
    logger.debug('Legacy getAllUsers called');
    
    const result = await userService.getAllUsers();
    
    if (result.success) {
      // Return array of database row format for backward compatibility
      return result.users.map(user => user.toDatabaseObject());
    } else {
      return [];
    }
  } catch (error) {
    logger.error('Error in legacy getAllUsers', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Legacy function: Update user avatar
 * @deprecated Use UserService.updateUserAvatar() directly for new code
 */
async function updateUserAvatar(userId, avatarUrl) {
  try {
    logger.debug('Legacy updateUserAvatar called', { userId, avatarUrl });
    
    const result = await userService.updateUserAvatar(userId, avatarUrl);
    
    if (result.success) {
      // Return database row format for backward compatibility
      return result.user.toDatabaseObject();
    } else {
      return null; // Legacy behavior - return null if failed
    }
  } catch (error) {
    logger.error('Error in legacy updateUserAvatar', { error: error.message, stack: error.stack, userId });
    throw error;
  }
}

// Export legacy functions for backward compatibility
module.exports = {
  createUser,
  getUserById,
  getAllUsers,
  updateUserAvatar,
  
  // Also export the UserService instance for direct access to new functionality
  userService
};
