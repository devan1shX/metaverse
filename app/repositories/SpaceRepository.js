const { get_async_db } = require('../config/db_conn');
const { logger } = require('../utils/logger');
const Space = require('../models/Space');

/**
 * SpaceRepository Class
 * Handles all database operations for Space entities
 */
class SpaceRepository {
  constructor() {
    this.tableName = 'spaces';
    this.userSpaceTableName = 'user_spaces';
  }

  /**
   * Create a new space in the database
   * @param {Space} space - Space instance to create
   * @returns {Promise<Space|null>} Created space or null if failed
   */
  async create(space) {
    const db = await get_async_db();
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      const dbObject = space.toDatabaseObject();
      
      logger.debug('Creating space in database', { 
        id: space.id, 
        name: space.name, 
        adminUserId: space.adminUserId 
      });

      // Create the space
      const spaceResult = await client.query(
        `INSERT INTO ${this.tableName} (
          id, name, description, map_image_url, admin_user_id,
          is_public, max_users, is_active, created_at, updated_at, objects
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          dbObject.id,
          dbObject.name,
          dbObject.description,
          dbObject.map_image_url,
          dbObject.admin_user_id,
          dbObject.is_public,
          dbObject.max_users,
          dbObject.is_active,
          dbObject.created_at,
          dbObject.updated_at,
          dbObject.objects
        ]
      );

      // Add admin user to the space
      await client.query(
        `INSERT INTO ${this.userSpaceTableName} (user_id, space_id, joined_at)
         VALUES ($1, $2, NOW())`,
        [space.adminUserId, space.id]
      );

      await client.query('COMMIT');

      if (spaceResult.rows.length > 0) {
        logger.info('Space created successfully in database', { 
          space_id: space.id, 
          name: space.name 
        });
        return Space.fromDatabaseRow(spaceResult.rows[0], [space.adminUserId]);
      }

      return null;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating space in database', { 
        error: error.message, 
        stack: error.stack, 
        name: space.name 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find space by ID
   * @param {string} id - Space ID
   * @returns {Promise<Space|null>} Space instance or null if not found
   */
  async findById(id) {
    try {
      const db = await get_async_db();
      logger.debug('Finding space by ID', { space_id: id });

      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id = $1`,
        [id]
      );

      if (result.rows.length > 0) {
        // Get users in this space
        const userIds = await this.getUserIdsInSpace(id);
        
        logger.debug('Space found by ID', { space_id: id });
        return Space.fromDatabaseRow(result.rows[0], userIds);
      }

      logger.warn('Space not found by ID', { space_id: id });
      return null;
    } catch (error) {
      logger.error('Error finding space by ID', { 
        error: error.message, 
        stack: error.stack, 
        space_id: id 
      });
      throw error;
    }
  }

  /**
   * Find spaces by admin user ID
   * @param {string} adminUserId - Admin user ID
   * @returns {Promise<Space[]>} Array of Space instances
   */
  async findByAdminUserId(adminUserId) {
    try {
      const db = await get_async_db();
      logger.debug('Finding spaces by admin user ID', { adminUserId });

      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE admin_user_id = $1 ORDER BY created_at DESC`,
        [adminUserId]
      );

      const spaces = [];
      for (const row of result.rows) {
        const userIds = await this.getUserIdsInSpace(row.id);
        spaces.push(Space.fromDatabaseRow(row, userIds));
      }

      logger.info('Spaces found by admin user ID', { 
        adminUserId, 
        count: spaces.length 
      });
      return spaces;
    } catch (error) {
      logger.error('Error finding spaces by admin user ID', { 
        error: error.message, 
        stack: error.stack, 
        adminUserId 
      });
      throw error;
    }
  }

  /**
   * Get all spaces with optional filters
   * @param {Object} filters - Optional filters (isPublic, isActive, etc.)
   * @param {number} limit - Optional limit
   * @param {number} offset - Optional offset for pagination
   * @returns {Promise<Space[]>} Array of Space instances
   */
  async findAll(filters = {}, limit = null, offset = 0) {
    try {
      const db = await get_async_db();
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      // Build WHERE conditions
      if (filters.isPublic !== undefined) {
        conditions.push(`is_public = $${params.length + 1}`);
        params.push(filters.isPublic);
      }

      if (filters.isActive !== undefined) {
        conditions.push(`is_active = $${params.length + 1}`);
        params.push(filters.isActive);
      }

      if (filters.adminUserId) {
        conditions.push(`admin_user_id = $${params.length + 1}`);
        params.push(filters.adminUserId);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Add ordering
      query += ` ORDER BY created_at DESC`;

      // Add pagination
      if (limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }

      if (offset > 0) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }

      logger.debug('Finding all spaces', { filters, limit, offset });

      const result = await db.query(query, params);
      
      const spaces = [];
      for (const row of result.rows) {
        const userIds = await this.getUserIdsInSpace(row.id);
        spaces.push(Space.fromDatabaseRow(row, userIds));
      }

      logger.info('Spaces fetched', { count: spaces.length });
      return spaces;
    } catch (error) {
      logger.error('Error finding all spaces', { 
        error: error.message, 
        stack: error.stack, 
        filters 
      });
      throw error;
    }
  }

  /**
   * Update space in database
   * @param {Space} space - Space instance with updated data
   * @returns {Promise<Space|null>} Updated space or null if not found
   */
  async update(space) {
    try {
      const db = await get_async_db();
      const dbObject = space.toDatabaseObject();
      
      logger.debug('Updating space in database', { space_id: space.id });

      const result = await db.query(
        `UPDATE ${this.tableName} SET
          name = $2,
          description = $3,
          map_image_url = $4,
          is_public = $5,
          max_users = $6,
          is_active = $7,
          updated_at = $8,
          objects = $9
        WHERE id = $1
        RETURNING *`,
        [
          space.id,
          dbObject.name,
          dbObject.description,
          dbObject.map_image_url,
          dbObject.is_public,
          dbObject.max_users,
          dbObject.is_active,
          new Date(),
          dbObject.objects
        ]
      );

      if (result.rows.length > 0) {
        const userIds = await this.getUserIdsInSpace(space.id);
        logger.info('Space updated successfully', { space_id: space.id });
        return Space.fromDatabaseRow(result.rows[0], userIds);
      }

      logger.warn('Space not found for update', { space_id: space.id });
      return null;
    } catch (error) {
      logger.error('Error updating space', { 
        error: error.message, 
        stack: error.stack, 
        space_id: space.id 
      });
      throw error;
    }
  }

  /**
   * Add user to space
   * @param {string} spaceId - Space ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async addUserToSpace(spaceId, userId) {
    try {
      const db = await get_async_db();
      logger.debug('Adding user to space', { spaceId, userId });

      // Check if user is already in space
      const existingResult = await db.query(
        `SELECT 1 FROM ${this.userSpaceTableName} WHERE user_id = $1 AND space_id = $2`,
        [userId, spaceId]
      );

      if (existingResult.rows.length > 0) {
        logger.warn('User already in space', { spaceId, userId });
        return false;
      }

      // Add user to space
      await db.query(
        `INSERT INTO ${this.userSpaceTableName} (user_id, space_id, joined_at)
         VALUES ($1, $2, NOW())`,
        [userId, spaceId]
      );

      logger.info('User added to space successfully', { spaceId, userId });
      return true;
    } catch (error) {
      logger.error('Error adding user to space', { 
        error: error.message, 
        stack: error.stack, 
        spaceId, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Remove user from space
   * @param {string} spaceId - Space ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async removeUserFromSpace(spaceId, userId) {
    try {
      const db = await get_async_db();
      logger.debug('Removing user from space', { spaceId, userId });

      const result = await db.query(
        `DELETE FROM ${this.userSpaceTableName} WHERE user_id = $1 AND space_id = $2`,
        [userId, spaceId]
      );

      const success = result.rowCount > 0;
      if (success) {
        logger.info('User removed from space successfully', { spaceId, userId });
      } else {
        logger.warn('User not found in space for removal', { spaceId, userId });
      }

      return success;
    } catch (error) {
      logger.error('Error removing user from space', { 
        error: error.message, 
        stack: error.stack, 
        spaceId, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Get user IDs in a space
   * @param {string} spaceId - Space ID
   * @returns {Promise<string[]>} Array of user IDs
   */
  async getUserIdsInSpace(spaceId) {
    try {
      const db = await get_async_db();
      
      const result = await db.query(
        `SELECT user_id FROM ${this.userSpaceTableName} WHERE space_id = $1`,
        [spaceId]
      );

      return result.rows.map(row => row.user_id);
    } catch (error) {
      logger.error('Error getting user IDs in space', { 
        error: error.message, 
        stack: error.stack, 
        spaceId 
      });
      throw error;
    }
  }

  /**
   * Get space IDs for a user
   * @param {string} userId - User ID
   * @returns {Promise<string[]>} Array of space IDs
   */
  async getSpaceIdsForUser(userId) {
    try {
      const db = await get_async_db();
      
      const result = await db.query(
        `SELECT space_id FROM ${this.userSpaceTableName} WHERE user_id = $1`,
        [userId]
      );

      return result.rows.map(row => row.space_id);
    } catch (error) {
      logger.error('Error getting space IDs for user', { 
        error: error.message, 
        stack: error.stack, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Delete space (soft delete by setting isActive to false)
   * @param {string} spaceId - Space ID
   * @returns {Promise<boolean>} Success status
   */
  async softDelete(spaceId) {
    try {
      const db = await get_async_db();
      logger.debug('Soft deleting space', { space_id: spaceId });

      const result = await db.query(
        `UPDATE ${this.tableName} SET
          is_active = false,
          updated_at = NOW()
        WHERE id = $1`,
        [spaceId]
      );

      const success = result.rowCount > 0;
      if (success) {
        logger.info('Space soft deleted successfully', { space_id: spaceId });
      } else {
        logger.warn('Space not found for soft delete', { space_id: spaceId });
      }

      return success;
    } catch (error) {
      logger.error('Error soft deleting space', { 
        error: error.message, 
        stack: error.stack, 
        space_id: spaceId 
      });
      throw error;
    }
  }

  /**
   * Hard delete space (permanently remove from database)
   * @param {string} spaceId - Space ID
   * @returns {Promise<boolean>} Success status
   */
  async hardDelete(spaceId) {
    const db = await get_async_db();
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.debug('Hard deleting space', { space_id: spaceId });

      // Delete user-space relationships first
      await client.query(
        `DELETE FROM ${this.userSpaceTableName} WHERE space_id = $1`,
        [spaceId]
      );

      // Delete the space
      const result = await client.query(
        `DELETE FROM ${this.tableName} WHERE id = $1`,
        [spaceId]
      );

      await client.query('COMMIT');

      const success = result.rowCount > 0;
      if (success) {
        logger.info('Space hard deleted successfully', { space_id: spaceId });
      } else {
        logger.warn('Space not found for hard delete', { space_id: spaceId });
      }

      return success;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error hard deleting space', { 
        error: error.message, 
        stack: error.stack, 
        space_id: spaceId 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if space name exists
   * @param {string} name - Space name to check
   * @param {string} excludeSpaceId - Optional space ID to exclude from check
   * @returns {Promise<boolean>} True if name exists
   */
  async nameExists(name, excludeSpaceId = null) {
    try {
      const db = await get_async_db();
      let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE name = $1`;
      const params = [name];

      if (excludeSpaceId) {
        query += ` AND id != $2`;
        params.push(excludeSpaceId);
      }

      const result = await db.query(query, params);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking space name existence', { 
        error: error.message, 
        stack: error.stack, 
        name 
      });
      throw error;
    }
  }
}

module.exports = SpaceRepository;
