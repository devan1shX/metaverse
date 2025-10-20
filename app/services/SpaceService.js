const Space = require('../models/Space');
const SpaceRepository = require('../repositories/SpaceRepository');
const UserRepository = require('../repositories/UserRepository');
const { logger } = require('../utils/logger');

/**
 * SpaceService Class
 * Contains business logic for space operations
 */
class SpaceService {
  constructor() {
    this.spaceRepository = new SpaceRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * Create a new space
   * @param {Object} spaceData - Space data object
   * @returns {Promise<{success: boolean, space?: Space, errors?: string[]}>}
   */
  async createSpace(spaceData) {
    try {
      logger.info('Creating new space', { name: spaceData.name, adminUserId: spaceData.adminUserId });

      // Create space instance
      const space = new Space(spaceData);

      // Validate space data
      const validation = space.validate();
      if (!validation.isValid) {
        logger.warn('Space validation failed', { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Check if admin user exists
      const adminUser = await this.userRepository.findById(space.adminUserId);
      if (!adminUser) {
        logger.warn('Admin user not found', { adminUserId: space.adminUserId });
        return {
          success: false,
          errors: ['Admin user not found']
        };
      }

      // Check if space name already exists
      const nameExists = await this.spaceRepository.nameExists(space.name);
      if (nameExists) {
        logger.warn('Space name already exists', { name: space.name });
        return {
          success: false,
          errors: ['Space name already exists']
        };
      }

      // Create space in database
      const createdSpace = await this.spaceRepository.create(space);
      if (!createdSpace) {
        logger.error('Failed to create space in database');
        return {
          success: false,
          errors: ['Failed to create space']
        };
      }

      logger.info('Space created successfully', { space_id: createdSpace.id });
      return {
        success: true,
        space: createdSpace
      };
    } catch (error) {
      logger.error('Error in createSpace service', { 
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
   * Get space by ID
   * @param {string} spaceId - Space ID
   * @returns {Promise<{success: boolean, space?: Space, error?: string}>}
   */
  async getSpaceById(spaceId) {
    try {
      logger.debug('Getting space by ID', { space_id: spaceId });

      if (!spaceId) {
        return {
          success: false,
          error: 'Space ID is required'
        };
      }

      const space = await this.spaceRepository.findById(spaceId);
      if (!space) {
        logger.warn('Space not found', { space_id: spaceId });
        return {
          success: false,
          error: 'Space not found'
        };
      }

      return {
        success: true,
        space: space
      };
    } catch (error) {
      logger.error('Error in getSpaceById service', { 
        error: error.message, 
        stack: error.stack, 
        space_id: spaceId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get all spaces with optional filters
   * @param {Object} options - Query options (filters, pagination)
   * @returns {Promise<{success: boolean, spaces?: Space[], error?: string}>}
   */
  async getAllSpaces(options = {}) {
    try {
      const { filters = {}, limit = null, offset = 0 } = options;
      logger.debug('Getting all spaces', { filters, limit, offset });

      const spaces = await this.spaceRepository.findAll(filters, limit, offset);
      
      return {
        success: true,
        spaces: spaces
      };
    } catch (error) {
      logger.error('Error in getAllSpaces service', { 
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
   * Get spaces by admin user ID
   * @param {string} adminUserId - Admin user ID
   * @returns {Promise<{success: boolean, spaces?: Space[], error?: string}>}
   */
  async getSpacesByAdminUserId(adminUserId) {
    try {
      logger.debug('Getting spaces by admin user ID', { adminUserId });

      if (!adminUserId) {
        return {
          success: false,
          error: 'Admin user ID is required'
        };
      }

      const spaces = await this.spaceRepository.findByAdminUserId(adminUserId);
      
      return {
        success: true,
        spaces: spaces
      };
    } catch (error) {
      logger.error('Error in getSpacesByAdminUserId service', { 
        error: error.message, 
        stack: error.stack, 
        adminUserId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Update space
   * @param {string} spaceId - Space ID
   * @param {Object} updateData - Data to update
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<{success: boolean, space?: Space, errors?: string[]}>}
   */
  async updateSpace(spaceId, updateData, requestingUserId) {
    try {
      logger.info('Updating space', { space_id: spaceId, requestingUserId });

      if (!spaceId) {
        return {
          success: false,
          errors: ['Space ID is required']
        };
      }

      // Get existing space
      const existingSpace = await this.spaceRepository.findById(spaceId);
      if (!existingSpace) {
        logger.warn('Space not found for update', { space_id: spaceId });
        return {
          success: false,
          errors: ['Space not found']
        };
      }

      // Check if requesting user is admin of the space
      if (!existingSpace.isAdmin(requestingUserId)) {
        logger.warn('User not authorized to update space', { 
          space_id: spaceId, 
          requestingUserId 
        });
        return {
          success: false,
          errors: ['Not authorized to update this space']
        };
      }

      // Check for name uniqueness if name is being updated
      if (updateData.name && updateData.name !== existingSpace.name) {
        const nameExists = await this.spaceRepository.nameExists(updateData.name, spaceId);
        if (nameExists) {
          return {
            success: false,
            errors: ['Space name already exists']
          };
        }
      }

      // Update space properties
      existingSpace.update(updateData);

      // Validate updated space
      const validation = existingSpace.validate();
      if (!validation.isValid) {
        logger.warn('Space update validation failed', { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Update in database
      const updatedSpace = await this.spaceRepository.update(existingSpace);
      if (!updatedSpace) {
        logger.error('Failed to update space in database');
        return {
          success: false,
          errors: ['Failed to update space']
        };
      }

      logger.info('Space updated successfully', { space_id: spaceId });
      return {
        success: true,
        space: updatedSpace
      };
    } catch (error) {
      logger.error('Error in updateSpace service', { 
        error: error.message, 
        stack: error.stack, 
        space_id: spaceId 
      });
      return {
        success: false,
        errors: ['Internal server error']
      };
    }
  }

  /**
   * Join space
   * @param {string} spaceId - Space ID
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, space?: Space, error?: string}>}
   */
  async joinSpace(spaceId, userId) {
    try {
      logger.info('User joining space', { spaceId, userId });

      if (!spaceId || !userId) {
        return {
          success: false,
          error: 'Space ID and User ID are required'
        };
      }

      // Get space
      const space = await this.spaceRepository.findById(spaceId);
      if (!space) {
        return {
          success: false,
          error: 'Space not found'
        };
      }

      // Check if space is active
      if (!space.isActiveSpace()) {
        return {
          success: false,
          error: 'Space is not active'
        };
      }

      // Check if user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if user is already in space
      if (space.hasUser(userId)) {
        return {
          success: false,
          error: 'User is already in this space'
        };
      }

      // Check if space is full
      if (space.isFull()) {
        return {
          success: false,
          error: 'Space is full'
        };
      }

      // Add user to space in database
      const success = await this.spaceRepository.addUserToSpace(spaceId, userId);
      if (!success) {
        logger.error('Failed to add user to space in database');
        return {
          success: false,
          error: 'Failed to join space'
        };
      }

      // Get updated space
      const updatedSpace = await this.spaceRepository.findById(spaceId);

      logger.info('User joined space successfully', { spaceId, userId });
      return {
        success: true,
        space: updatedSpace
      };
    } catch (error) {
      logger.error('Error in joinSpace service', { 
        error: error.message, 
        stack: error.stack, 
        spaceId, 
        userId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Leave space
   * @param {string} spaceId - Space ID
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async leaveSpace(spaceId, userId) {
    try {
      logger.info('User leaving space', { spaceId, userId });

      if (!spaceId || !userId) {
        return {
          success: false,
          error: 'Space ID and User ID are required'
        };
      }

      // Get space
      const space = await this.spaceRepository.findById(spaceId);
      if (!space) {
        return {
          success: false,
          error: 'Space not found'
        };
      }

      // Check if user is in space
      if (!space.hasUser(userId)) {
        return {
          success: false,
          error: 'User is not in this space'
        };
      }

      // Check if user is admin (admin cannot leave their own space)
      if (space.isAdmin(userId)) {
        return {
          success: false,
          error: 'Admin cannot leave their own space'
        };
      }

      // Remove user from space in database
      const success = await this.spaceRepository.removeUserFromSpace(spaceId, userId);
      if (!success) {
        logger.error('Failed to remove user from space in database');
        return {
          success: false,
          error: 'Failed to leave space'
        };
      }

      logger.info('User left space successfully', { spaceId, userId });
      return {
        success: true
      };
    } catch (error) {
      logger.error('Error in leaveSpace service', { 
        error: error.message, 
        stack: error.stack, 
        spaceId, 
        userId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Add object to space
   * @param {string} spaceId - Space ID
   * @param {Object} objectData - Object data
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<{success: boolean, space?: Space, error?: string}>}
   */
  async addObjectToSpace(spaceId, objectData, requestingUserId) {
    try {
      logger.info('Adding object to space', { spaceId, requestingUserId });

      if (!spaceId || !objectData || !requestingUserId) {
        return {
          success: false,
          error: 'Space ID, object data, and requesting user ID are required'
        };
      }

      // Get space
      const space = await this.spaceRepository.findById(spaceId);
      if (!space) {
        return {
          success: false,
          error: 'Space not found'
        };
      }

      // Check if requesting user is admin of the space
      if (!space.isAdmin(requestingUserId)) {
        return {
          success: false,
          error: 'Not authorized to add objects to this space'
        };
      }

      // Add object to space
      const success = space.addObject(objectData);
      if (!success) {
        return {
          success: false,
          error: 'Failed to add object (object may already exist)'
        };
      }

      // Update space in database
      const updatedSpace = await this.spaceRepository.update(space);
      if (!updatedSpace) {
        logger.error('Failed to update space with new object');
        return {
          success: false,
          error: 'Failed to add object to space'
        };
      }

      logger.info('Object added to space successfully', { spaceId, objectId: objectData.id });
      return {
        success: true,
        space: updatedSpace
      };
    } catch (error) {
      logger.error('Error in addObjectToSpace service', { 
        error: error.message, 
        stack: error.stack, 
        spaceId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Remove object from space
   * @param {string} spaceId - Space ID
   * @param {string} objectId - Object ID
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<{success: boolean, space?: Space, error?: string}>}
   */
  async removeObjectFromSpace(spaceId, objectId, requestingUserId) {
    try {
      logger.info('Removing object from space', { spaceId, objectId, requestingUserId });

      if (!spaceId || !objectId || !requestingUserId) {
        return {
          success: false,
          error: 'Space ID, object ID, and requesting user ID are required'
        };
      }

      // Get space
      const space = await this.spaceRepository.findById(spaceId);
      if (!space) {
        return {
          success: false,
          error: 'Space not found'
        };
      }

      // Check if requesting user is admin of the space
      if (!space.isAdmin(requestingUserId)) {
        return {
          success: false,
          error: 'Not authorized to remove objects from this space'
        };
      }

      // Remove object from space
      const success = space.removeObject(objectId);
      if (!success) {
        return {
          success: false,
          error: 'Object not found in space'
        };
      }

      // Update space in database
      const updatedSpace = await this.spaceRepository.update(space);
      if (!updatedSpace) {
        logger.error('Failed to update space after removing object');
        return {
          success: false,
          error: 'Failed to remove object from space'
        };
      }

      logger.info('Object removed from space successfully', { spaceId, objectId });
      return {
        success: true,
        space: updatedSpace
      };
    } catch (error) {
      logger.error('Error in removeObjectFromSpace service', { 
        error: error.message, 
        stack: error.stack, 
        spaceId, 
        objectId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Deactivate space (soft delete)
   * @param {string} spaceId - Space ID
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deactivateSpace(spaceId, requestingUserId) {
    try {
      logger.info('Deactivating space', { space_id: spaceId, requestingUserId });

      if (!spaceId || !requestingUserId) {
        return {
          success: false,
          error: 'Space ID and requesting user ID are required'
        };
      }

      // Get space
      const space = await this.spaceRepository.findById(spaceId);
      if (!space) {
        return {
          success: false,
          error: 'Space not found'
        };
      }

      // Check if requesting user is admin of the space
      if (!space.isAdmin(requestingUserId)) {
        return {
          success: false,
          error: 'Not authorized to deactivate this space'
        };
      }

      const success = await this.spaceRepository.softDelete(spaceId);
      if (!success) {
        return {
          success: false,
          error: 'Space not found'
        };
      }

      logger.info('Space deactivated successfully', { space_id: spaceId });
      return {
        success: true
      };
    } catch (error) {
      logger.error('Error in deactivateSpace service', { 
        error: error.message, 
        stack: error.stack, 
        space_id: spaceId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Delete space permanently
   * @param {string} spaceId - Space ID
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteSpace(spaceId, requestingUserId) {
    try {
      logger.info('Deleting space permanently', { space_id: spaceId, requestingUserId });

      if (!spaceId || !requestingUserId) {
        return {
          success: false,
          error: 'Space ID and requesting user ID are required'
        };
      }

      // Get space
      const space = await this.spaceRepository.findById(spaceId);
      if (!space) {
        return {
          success: false,
          error: 'Space not found'
        };
      }

      // Check if requesting user is admin of the space
      if (!space.isAdmin(requestingUserId)) {
        return {
          success: false,
          error: 'Not authorized to delete this space'
        };
      }

      const success = await this.spaceRepository.hardDelete(spaceId);
      if (!success) {
        return {
          success: false,
          error: 'Space not found'
        };
      }

      logger.info('Space deleted permanently', { space_id: spaceId });
      return {
        success: true
      };
    } catch (error) {
      logger.error('Error in deleteSpace service', { 
        error: error.message, 
        stack: error.stack, 
        space_id: spaceId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get space's safe data (for API responses)
   * @param {string} spaceId - Space ID
   * @returns {Promise<{success: boolean, space?: Object, error?: string}>}
   */
  async getSpaceSafeData(spaceId) {
    try {
      const result = await this.getSpaceById(spaceId);
      if (!result.success) {
        return result;
      }

      return {
        success: true,
        space: result.space.toSafeObject()
      };
    } catch (error) {
      logger.error('Error in getSpaceSafeData service', { 
        error: error.message, 
        stack: error.stack, 
        space_id: spaceId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get spaces for user (spaces where user is a member)
   * @param {string} userId - User ID
   * @returns {Promise<{success: boolean, spaces?: Space[], error?: string}>}
   */
  async getSpacesForUser(userId) {
    try {
      logger.debug('Getting spaces for user', { userId });

      if (!userId) {
        return {
          success: false,
          error: 'User ID is required'
        };
      }

      // Get space IDs for user
      const spaceIds = await this.spaceRepository.getSpaceIdsForUser(userId);
      
      // Get full space objects
      const spaces = [];
      for (const spaceId of spaceIds) {
        const space = await this.spaceRepository.findById(spaceId);
        if (space && space.isActiveSpace()) {
          spaces.push(space);
        }
      }

      return {
        success: true,
        spaces: spaces
      };
    } catch (error) {
      logger.error('Error in getSpacesForUser service', { 
        error: error.message, 
        stack: error.stack, 
        userId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }
}

// Create and export singleton instance
module.exports = SpaceService;
