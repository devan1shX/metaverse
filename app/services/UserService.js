const User = require('../models/User');
const UserRepository = require('../repositories/UserRepository');
const { logger } = require('../utils/logger');


class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Create a new user
   * @param {Object} userData - User data object
   * @returns {Promise<{success: boolean, user?: User, errors?: string[]}>}
   */
  async createUser(userData) {
    try {
      logger.info('Creating new user', { username: userData.username, email: userData.email });

      // Create user instance
      const user = new User(userData);

      // Validate user data
      const validation = user.validate();
      if (!validation.isValid) {
        logger.warn('User validation failed', { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Check if email already exists
      const emailExists = await this.userRepository.emailExists(user.email);
      if (emailExists) {
        logger.warn('Email already exists', { email: user.email });
        return {
          success: false,
          errors: ['Email already exists']
        };
      }

      // Check if username already exists
      const usernameExists = await this.userRepository.usernameExists(user.username);
      if (usernameExists) {
        logger.warn('Username already exists', { username: user.username });
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
        logger.error('Failed to create user in database');
        return {
          success: false,
          errors: ['Failed to create user']
        };
      }

      logger.info('User created successfully', { user_id: createdUser.id });
      return {
        success: true,
        user: createdUser
      };
    } catch (error) {
      logger.error('Error in createUser service', { 
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
      logger.debug('Getting user by ID', { user_id: userId });

      if (!userId) {
        return {
          success: false,
          error: 'User ID is required'
        };
      }

      const user = await this.userRepository.findById(userId);
      if (!user) {
        logger.warn('User not found', { user_id: userId });
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
      logger.error('Error in getUserById service', { 
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
      logger.debug('Getting user by email', { email });

      if (!email) {
        return {
          success: false,
          error: 'Email is required'
        };
      }

      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        logger.warn('User not found by email', { email });
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
      logger.error('Error in getUserByEmail service', { 
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
      logger.debug('Getting all users', { filters, limit, offset });

      const users = await this.userRepository.findAll(filters, limit, offset);
      
      return {
        success: true,
        users: users
      };
    } catch (error) {
      logger.error('Error in getAllUsers service', { 
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
      logger.info('Updating user', { user_id: userId });

      if (!userId) {
        return {
          success: false,
          errors: ['User ID is required']
        };
      }

      // Get existing user
      const existingUser = await this.userRepository.findById(userId);
      if (!existingUser) {
        logger.warn('User not found for update', { user_id: userId });
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
        logger.warn('User update validation failed', { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Update in database
      const updatedUser = await this.userRepository.update(existingUser);
      if (!updatedUser) {
        logger.error('Failed to update user in database');
        return {
          success: false,
          errors: ['Failed to update user']
        };
      }

      logger.info('User updated successfully', { user_id: userId });
      return {
        success: true,
        user: updatedUser
      };
    } catch (error) {
      logger.error('Error in updateUser service', { 
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
      logger.info('Updating user avatar', { user_id: userId, avatarUrl });

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
      logger.error('Error in updateUserAvatar service', { 
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
      logger.info('Changing user password', { user_id: userId });

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
        logger.warn('Invalid current password', { user_id: userId });
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
        logger.error('Failed to update password in database');
        return {
          success: false,
          error: 'Failed to update password'
        };
      }

      logger.info('Password changed successfully', { user_id: userId });
      return {
        success: true
      };
    } catch (error) {
      logger.error('Error in changePassword service', { 
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
      logger.info('Authenticating user', { email });

      if (!email || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Get user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        logger.warn('User not found for authentication', { email });
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Check if user is active
      if (!user.isActiveUser()) {
        logger.warn('Inactive user attempted login', { email });
        return {
          success: false,
          error: 'Account is deactivated'
        };
      }

      // Verify password
      const isPasswordValid = await user.verifyPassword(password);
      if (!isPasswordValid) {
        logger.warn('Invalid password for user', { email });
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      logger.info('User authenticated successfully', { user_id: user.id, email });
      return {
        success: true,
        user: user
      };
    } catch (error) {
      logger.error('Error in authenticateUser service', { 
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
      logger.info('Deactivating user', { user_id: userId });

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

      logger.info('User deactivated successfully', { user_id: userId });
      return {
        success: true
      };
    } catch (error) {
      logger.error('Error in deactivateUser service', { 
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
      logger.info('Deleting user permanently', { user_id: userId });

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

      logger.info('User deleted permanently', { user_id: userId });
      return {
        success: true
      };
    } catch (error) {
      logger.error('Error in deleteUser service', { 
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
      const result = await this.getUserById(userId);
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        user: result.user.toSafeObject()
      };
    } catch (error) {
      logger.error('Error in getUserSafeData service', { 
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
  async getUserSpaces(userId) {
    try{
      const user = await this.userRepository.findById(userId);
      if(!user){
        return {
          "status":"User not found",
        }
      }
      // if we get a user , we will return the spaces of that user 
      return user.getSpaces();
    }
    catch(error){
      
      logger.error('Error in getUserSpaces service', { 
        error: error.message, 
        stack: error.stack, 
        user_id: userId ,
        file:"UserService.js",
        function:"getUserSpaces"
      });
    }

  }

  async getUserNotifications(userId) {
    try{
      const user = await this.userRepository.findById(userId);
      if(!user){
        return {
          "status":"User not found",
        }
      }
      // if we get a user , we will return the spaces of that user 
      return user.getNotifications();
    }
    catch(error){
      
      logger.error('Error in getUserNotifications service', { 
        error: error.message, 
        stack: error.stack, 
        user_id: userId ,
        file:"UserService.js",
        function:"getUserNotifications"
      });
    }

  }
}

userServiceSingleton = new UserService();
module.exports = userServiceSingleton;
