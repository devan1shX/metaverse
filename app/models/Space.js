const uuid4 = require('uuid4');
const { logger } = require('../utils/logger');

/**
 * Space Model Class
 * Represents a virtual space/room in the metaverse
 */
class Space {
  constructor({
    id = null,
    name,
    description = null,
    mapImageUrl = null,
    adminUserId,
    isPublic = true,
    maxUsers = 50,
    isActive = true,
    createdAt = null,
    updatedAt = null,
    // Arrays that will be populated from relationships
    userIds = [],
    objects = []
  } = {}) {
    this.id = id || uuid4();
    this.name = name;
    this.description = description;
    this.mapImageUrl = mapImageUrl;
    this.adminUserId = adminUserId;
    this.isPublic = isPublic;
    this.maxUsers = maxUsers;
    this.isActive = isActive;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    
    // Relationship data
    this.userIds = userIds || [];
    this.objects = objects || [];
  }

  /**
   * Validate space data
   * @returns {Object} validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];

    // Name validation
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Space name is required');
    } else if (this.name.length < 3) {
      errors.push('Space name must be at least 3 characters long');
    } else if (this.name.length > 100) {
      errors.push('Space name must be less than 100 characters');
    }

    // Admin user ID validation
    if (!this.adminUserId || this.adminUserId.trim().length === 0) {
      errors.push('Admin user ID is required');
    }

    // Description validation
    if (this.description && this.description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }

    // Map image URL validation
    if (this.mapImageUrl && this.mapImageUrl.length > 255) {
      errors.push('Map image URL must be less than 255 characters');
    }

    // Max users validation
    if (this.maxUsers < 1) {
      errors.push('Max users must be at least 1');
    } else if (this.maxUsers > 1000) {
      errors.push('Max users cannot exceed 1000');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Add user to space
   * @param {string} userId - User ID to add
   * @returns {boolean} Success status
   */
  addUser(userId) {
    if (!userId || this.userIds.includes(userId)) {
      return false;
    }

    if (this.userIds.length >= this.maxUsers) {
      return false; // Space is full
    }

    this.userIds.push(userId);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Remove user from space
   * @param {string} userId - User ID to remove
   * @returns {boolean} Success status
   */
  removeUser(userId) {
    const index = this.userIds.indexOf(userId);
    if (index === -1) {
      return false;
    }

    this.userIds.splice(index, 1);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Add object to space
   * @param {Object} object - Object to add
   * @returns {boolean} Success status
   */
  addObject(object) {
    if (!object || !object.id) {
      return false;
    }

    // Check if object already exists
    const existingIndex = this.objects.findIndex(obj => obj.id === object.id);
    if (existingIndex !== -1) {
      return false;
    }

    this.objects.push(object);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Remove object from space
   * @param {string} objectId - Object ID to remove
   * @returns {boolean} Success status
   */
  removeObject(objectId) {
    const index = this.objects.findIndex(obj => obj.id === objectId);
    if (index === -1) {
      return false;
    }

    this.objects.splice(index, 1);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Update object in space
   * @param {string} objectId - Object ID to update
   * @param {Object} updates - Updates to apply
   * @returns {boolean} Success status
   */
  updateObject(objectId, updates) {
    const index = this.objects.findIndex(obj => obj.id === objectId);
    if (index === -1) {
      return false;
    }

    this.objects[index] = { ...this.objects[index], ...updates };
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Check if user is admin of this space
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  isAdmin(userId) {
    return this.adminUserId === userId;
  }

  /**
   * Check if user is in this space
   * @param {string} userId - User ID to check
   * @returns {boolean}
   */
  hasUser(userId) {
    return this.userIds.includes(userId);
  }

  /**
   * Get current user count
   * @returns {number}
   */
  getCurrentUserCount() {
    return this.userIds.length;
  }

  /**
   * Check if space is full
   * @returns {boolean}
   */
  isFull() {
    return this.userIds.length >= this.maxUsers;
  }

  /**
   * Check if space is active
   * @returns {boolean}
   */
  isActiveSpace() {
    return this.isActive === true;
  }

  /**
   * Update space properties
   * @param {Object} updates - Object containing fields to update
   */
  update(updates) {
    const allowedUpdates = [
      'name', 'description', 'mapImageUrl', 'isPublic', 
      'maxUsers', 'isActive'
    ];

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key) && updates[key] !== undefined) {
        this[key] = updates[key];
      }
    });

    this.updatedAt = new Date();
  }

  /**
   * Convert space to safe object (for API responses)
   * @returns {Object} Space object without sensitive data
   */
  toSafeObject() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      mapImageUrl: this.mapImageUrl,
      adminUserId: this.adminUserId,
      isPublic: this.isPublic,
      maxUsers: this.maxUsers,
      currentUsers: this.userIds.length,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      objects: this.objects
    };
  }

  /**
   * Convert space to database object
   * @returns {Object} Space object formatted for database operations
   */
  toDatabaseObject() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      map_image_url: this.mapImageUrl,
      admin_user_id: this.adminUserId,
      is_public: this.isPublic,
      max_users: this.maxUsers,
      is_active: this.isActive,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      objects: JSON.stringify(this.objects) // Store objects as JSON
    };
  }

  /**
   * Create Space instance from database row
   * @param {Object} dbRow - Database row object
   * @param {Array} userIds - Array of user IDs in this space
   * @returns {Space} Space instance
   */
  static fromDatabaseRow(dbRow, userIds = []) {
    if (!dbRow) return null;
    
    let objects = [];
    try {
      // Handle different possible states of the objects field
      if (dbRow.objects) {
        if (typeof dbRow.objects === 'string') {
          // If it's a string, try to parse it
          const trimmed = dbRow.objects.trim();
          if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
            objects = [];
          } else {
            objects = JSON.parse(trimmed);
          }
        } else if (Array.isArray(dbRow.objects)) {
          // If it's already an array (some databases return parsed JSON)
          objects = dbRow.objects;
        } else {
          // If it's some other type, default to empty array
          objects = [];
        }
      } else {
        // If objects field is null, undefined, or empty
        objects = [];
      }
      
      // Ensure objects is always an array
      if (!Array.isArray(objects)) {
        objects = [];
      }
    } catch (error) {
      logger.error('Error parsing space objects', { 
        error: error.message, 
        spaceId: dbRow.id,
        objectsValue: dbRow.objects 
      });
      objects = [];
    }

    return new Space({
      id: dbRow.id,
      name: dbRow.name,
      description: dbRow.description,
      mapImageUrl: dbRow.map_image_url,
      adminUserId: dbRow.admin_user_id,
      isPublic: dbRow.is_public,
      maxUsers: dbRow.max_users,
      isActive: dbRow.is_active,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
      userIds: userIds,
      objects: objects
    });
  }

  /**
   * Get space summary (minimal info)
   * @returns {Object} Space summary object
   */
  getSummary() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      mapImageUrl: this.mapImageUrl,
      isPublic: this.isPublic,
      currentUsers: this.userIds.length,
      maxUsers: this.maxUsers,
      isActive: this.isActive
    };
  }
}

module.exports = Space;
