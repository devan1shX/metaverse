const User = require('../models/User');
const UserRepository = require('../repositories/UserRepository');
const { logger } = require('../utils/logger');


class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  validateUser(userdata){
    // we just need 1. usernae , email , role , password , user created at , updated at , user_is active
    if(!userdata.user_name || !userdata.email || 
      !userdata.role || !userdata.password || !userdata.user_created_at || !userdata.user_updated_at || !userdata.user_is_active){
      return {
        success: false,
        errors: ['Invalid user data']
      };
    }
    return {
      success: true,
      errors: []
    };
  }
  /**
   * Create a new user
   * @param {Object} userData - User data object
   * @returns {Promise<{success: boolean, user?: User, errors?: string[]}>}
   */
  async createUser(userData) {
    try {
      
      logger.info('[UserService][createUser] Validating user data', { userData });
      
      // Create user instance
      const user = new User(userData);

      // Validate user data
      const validation = user.validate();
      if (!validation.isValid) {
        logger.warn('[UserService][createUser] User validation failed', { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Check if email already exists
      const emailExists = await this.userRepository.emailExists(user.email);
      if (emailExists) {
        logger.warn('[UserService][createUser] Email already exists', { email: user.email });
        return {
          success: false,
          errors: ['Email already exists']
        };
      }

      // Check if username already exists
      const usernameExists = await this.userRepository.usernameExists(user.username);
      if (usernameExists) {
        logger.warn('[UserService][createUser] Username already exists', { username: user.username });
        return {
          success: false,
          errors: ['Username already exists']
        };
      }

      // Hash password if provided
      if (user.password) {
        await user.hashPassword();
      }

      // Create user in database
      const createdUser = await this.userRepository.create(user);
      if (!createdUser) {
        logger.error('[UserService][createUser] Failed to create user in database');
        return {
          success: false,
          errors: ['Failed to create user']
        };
      }

      logger.info('[UserService][createUser] User created successfully', { user_id: createdUser.id });
      return {
        success: true,
        user: createdUser
      };
    } catch (error) {
      logger.error('[UserService][createUser] Error in createUser service', { 
        error: error.message, 
        stack: error.stack 
      });
      return {
        success: false,
        errors: ['Internal server error']
      };
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, user?: User, error?: string}>}
   */
  async getUserById(userId) {
    try {
      logger.debug('[UserService][getUserById] Getting user by ID', { user_id: userId });

      if (!userId) {
        return {
          success: false,
          error: 'User ID is required'
        };
      }

      const user = await this.userRepository.findById(userId);
      if (!user) {
        logger.warn('[UserService][getUserById] User not found', { user_id: userId });
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        user: user
      };
    } catch (error) {
      logger.error('[UserService][getUserById] Error in getUserById service', { 
        error: error.message, 
        stack: error.stack, 
        user_id: userId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<{success: boolean, user?: User, error?: string}>}
   */
  async getUserByEmail(email) {
    try {
      logger.debug('[UserService][getUserByEmail] Getting user by email', { email });

      if (!email) {
        return {
          success: false,
          error: 'Email is required'
        };
      }

      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        logger.warn('[UserService][getUserByEmail] User not found by email', { email });
        return {
          success: false,
          error: 'User not found'
        };
      }

      return {
        success: true,
        user: user
      };
    } catch (error) {
      logger.error('[UserService][getUserByEmail] Error in getUserByEmail service', { 
        error: error.message, 
        stack: error.stack, 
        email 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get all users with optional filters
   * @param {Object} options - Query options (filters, pagination)
   * @returns {Promise<{success: boolean, users?: User[], error?: string}>}
   */
  async getAllUsers(options = {}) {
    try {
      const { filters = {}, limit = null, offset = 0 } = options;
      logger.debug('[UserService][getAllUsers] Getting all users', { filters, limit, offset });

      const users = await this.userRepository.findAll(filters, limit, offset);
      
      return {
        success: true,
        users: users
      };
    } catch (error) {
      logger.error('[UserService][getAllUsers] Error in getAllUsers service', { 
        error: error.message, 
        stack: error.stack 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<{success: boolean, user?: User, errors?: string[]}>}
   */
  async updateUser(userId, updateData) {
    try {
      logger.info('[UserService][updateUser] Updating user', { user_id: userId });

      if (!userId) {
        return {
          success: false,
          errors: ['User ID is required']
        };
      }

      // Get existing user
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        logger.warn('[UserService][updateUser] User not found for update', { user_id: userId });
        return {
          success: false,
          errors: ['User not found']
        };
      }

      // Check for email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await this.userRepository.emailExists(updateData.email, userId);
        if (emailExists) {
          return {
            success: false,
            errors: ['Email already exists']
          };
        }
      }

      // Check for username uniqueness if username is being updated
      if (updateData.username && updateData.username !== existingUser.username) {
        const usernameExists = await this.userRepository.usernameExists(updateData.username, userId);
        if (usernameExists) {
          return {
            success: false,
            errors: ['Username already exists']
          };
        }
      }

      // Update user properties
      existingUser.update(updateData);

      // Validate updated user
      const validation = existingUser.validate();
      if (!validation.isValid) {
        logger.warn('[UserService][updateUser] User update validation failed', { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Update in database
      const updatedUser = await this.userRepository.update(existingUser);
      if (!updatedUser) {
        logger.error('[UserService][updateUser] Failed to update user in database');
        return {
          success: false,
          errors: ['Failed to update user']
        };
      }

      logger.info('[UserService][updateUser] User updated successfully', { user_id: userId });
      return {
        success: true,
        user: updatedUser
      };
    } catch (error) {
      logger.error('[UserService][updateUser] Error in updateUser service', { 
        error: error.message, 
        stack: error.stack, 
        user_id: userId 
      });
      return {
        success: false,
        errors: ['Internal server error']
      };
    }
  }

  /**
   * Update user avatar
   * @param {string} userId - User ID
   * @param {string} avatarUrl - New avatar URL
   * @returns {Promise<{success: boolean, user?: User, error?: string}>}
   */
  async updateUserAvatar(userId, avatarUrl) {
    try {
      logger.info('[UserService][updateUserAvatar] Updating user avatar', { user_id: userId, avatarUrl });

      if (!userId) {
        return {
          success: false,
          error: 'User ID is required'
        };
      }

      if (!avatarUrl) {
        return {
          success: false,
          error: 'Avatar URL is required'
        };
      }

      const result = await this.updateUser(userId, { avatarUrl });
      return result;
    } catch (error) {
      logger.error('[UserService][updateUserAvatar] Error in updateUserAvatar service', { 
        error: error.message, 
        stack: error.stack, 
        user_id: userId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      logger.info('[UserService][changePassword] Changing user password', { user_id: userId });

      if (!userId || !currentPassword || !newPassword) {
        return {
          success: false,
          error: 'User ID, current password, and new password are required'
        };
      }

      // Get user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
      if (!isCurrentPasswordValid) {
        logger.warn('[UserService][changePassword] Invalid current password', { user_id: userId });
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Validate new password
      if (newPassword.length < 6) {
        return {
          success: false,
          error: 'New password must be at least 6 characters long'
        };
      }

      // Hash new password
      const tempUser = new User({ password: newPassword });
      await tempUser.hashPassword();

      // Update password in database
      const success = await this.userRepository.updatePassword(userId, tempUser.password);
      if (!success) {
        logger.error('[UserService][changePassword] Failed to update password in database');
        return {
          success: false,
          error: 'Failed to update password'
        };
      }

      logger.info('[UserService][changePassword] Password changed successfully', { user_id: userId });
      return {
        success: true
      };
    } catch (error) {
      logger.error('[UserService][changePassword] Error in changePassword service', { 
        error: error.message, 
        stack: error.stack, 
        user_id: userId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Authenticate user (login)
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<{success: boolean, user?: User, error?: string}>}
   */
  async authenticateUser(email, password) {
    try {
      logger.info('[UserService][authenticateUser] Authenticating user', { email });

      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Get user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        logger.warn('[UserService][authenticateUser] User not found for authentication', { email });
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Check if user is active
      if (!user.isActiveUser()) {
        logger.warn('[UserService][authenticateUser] Inactive user attempted login', { email });
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      // Verify password
      const isPasswordValid = await user.verifyPassword(password);
      if (!isPasswordValid) {
        logger.warn('[UserService][authenticateUser] Invalid password for user', { email });
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      logger.info('[UserService][authenticateUser] User authenticated successfully', { user_id: user.id, email });
      return {
        success: true,
        user: user
      };
    } catch (error) {
      logger.error('[UserService][authenticateUser] Error in authenticateUser service', { 
        error: error.message, 
        stack: error.stack, 
        email 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Deactivate user (soft delete)
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, error?: string}>}
   *  wapper function around soft delete
   */
  async deactivateUser(userId) {
    try {
      logger.info('[UserService][deactivateUser] Deactivating user', { user_id: userId });

      if (!userId) {
        return {
          success: false,
          error: 'User ID is required'
        };
      }

      const success = await this.userRepository.softDelete(userId);
      if (!success) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      logger.info('[UserService][deactivateUser]User deactivated successfully', { user_id: userId });
      return {
        success: true
      };
    } catch (error) {
      logger.error('[UserService][deactivateUser] Error in deactivateUser service', { 
        error: error.message, 
        stack: error.stack, 
        user_id: userId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Delete user permanently
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteUser(userId) {
    try {
      logger.info('[UserService][deleteUser] Deleting user permanently', { user_id: userId });

      if (!userId) {
        return {
          success: false,
          error: 'User ID is required'
        };
      }

      const success = await this.userRepository.hardDelete(userId);
      if (!success) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      logger.info('[UserService][deleteUser] User deleted permanently', { user_id: userId });
      return {
        success: true
      };
    } catch (error) {
      logger.error('[UserService][deleteUser] Error in deleteUser service', { 
        error: error.message, 
        stack: error.stack, 
        user_id: userId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get user's safe data (without password)
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
   */
  async getUserSafeData(userId) {
    try {
      logger.info('[UserService][getUserSafeData] Getting user safe data', { user_id: userId });
      const result = await this.getUserById(userId);
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        user: result.user.toSafeObject()
      };
    } catch (error) {
      logger.error('[UserService][getUserSafeData] Error in getUserSafeData service', { 
        error: error.message, 
        stack: error.stack, 
        user_id: userId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }
  
}


module.exports = UserService;
