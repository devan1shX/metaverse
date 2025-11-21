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
          id, name, description, map_image_url, map_id, admin_user_id,
          is_public, max_users, is_active, created_at, updated_at, objects
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          dbObject.id,
          dbObject.name,
          dbObject.description,
          dbObject.map_image_url,
          dbObject.map_id,
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
  async getUserCount(spaceid){
    const db = await get_async_db();
    const result = await db.query(
      `SELECT COUNT(*) as count FROM ${this.userSpaceTableName} WHERE space_id = $1`,
      [spaceid]
    );
    return result.rows[0].count;
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
          map_id = $5,
          is_public = $6,
          max_users = $7,
          is_active = $8,
          updated_at = $9,
          objects = $10
        WHERE id = $1
        RETURNING *`,
        [
          space.id,
          dbObject.name,
          dbObject.description,
          dbObject.map_image_url,
          dbObject.map_id,
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

      // 1. Delete space-related notifications first
      await client.query(
        `DELETE FROM notifications 
         WHERE data->>'spaceId' = $1 
         OR (type = 'invites' AND data->>'spaceId' = $1)`,
        [spaceId]
      );
      logger.debug('Deleted space-related notifications', { space_id: spaceId });

      // 2. Update users' user_spaces JSONB field to remove the space
      // await client.query(
      //   `UPDATE users 
      //    SET user_spaces = user_spaces - $1,
      //        user_updated_at = CURRENT_TIMESTAMP
      //    WHERE user_spaces ? $1`,
      //   [spaceId]
      // );
      // logger.debug('Updated users user_spaces JSONB field', { space_id: spaceId });

      // 3. Delete user-space relationships
      await client.query(
        `DELETE FROM ${this.userSpaceTableName} WHERE space_id = $1`,
        [spaceId]
      );
      logger.debug('Deleted user-space relationships', { space_id: spaceId });

      // 4. Delete the space itself
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

  /**
   * Check if user is a member of a space
   * @param {string} spaceId - Space ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user is a member
   */
  async isUserMember(spaceId, userId) {
    try {
      const db = await get_async_db();
      
      const result = await db.query(
        `SELECT 1 FROM ${this.userSpaceTableName} WHERE user_id = $1 AND space_id = $2`,
        [userId, spaceId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking if user is member', { 
        error: error.message, 
        stack: error.stack, 
        spaceId, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Get user count in a space
   * @param {string} spaceId - Space ID
   * @returns {Promise<number>} Number of users in space
   */
  async getUserCount(spaceId) {
    try {
      const db = await get_async_db();
      
      const result = await db.query(
        `SELECT COUNT(*) as count FROM ${this.userSpaceTableName} WHERE space_id = $1`,
        [spaceId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting user count', { 
        error: error.message, 
        stack: error.stack, 
        spaceId 
      });
      throw error;
    }
  }

  /**
   * Get complete space row with all user information
   * @param {string} spaceId - Space ID
   * @returns {Promise<Object>} Complete space information with all users
   */
  async getCompleteSpaceInfo(spaceId) {
    try {
      const db = await get_async_db();
      
      // Get space with all users and their complete information
      const result = await db.query(
        `SELECT 
          s.*,
          json_agg(
            json_build_object(
              'id', u.id,
              'user_name', u.user_name,
              'email', u.email,
              'password', u.password,
              'role', u.role,
              'user_designation', u.user_designation,
              'user_created_at', u.user_created_at,
              'user_updated_at', u.user_updated_at,
              'user_avatar_url', u.user_avatar_url,
              'user_about', u.user_about,
              'user_is_active', u.user_is_active,
              'joined_at', us.joined_at,
              'is_admin', CASE WHEN u.id = s.admin_user_id THEN true ELSE false END
            )
          ) as users
        FROM ${this.tableName} s
        LEFT JOIN ${this.userSpaceTableName} us ON s.id = us.space_id
        LEFT JOIN users u ON us.user_id = u.id
        WHERE s.id = $1
        GROUP BY s.id`,
        [spaceId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const spaceData = result.rows[0];
      
      // Handle case where no users are in the space
      if (spaceData.users[0].id === null) {
        spaceData.users = [];
      }

      return spaceData;
    } catch (error) {
      logger.error('Error getting complete space info', { 
        error: error.message, 
        stack: error.stack, 
        spaceId 
      });
      throw error;
    }
  }

  /**
   * Get all spaces for a user with complete information
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of complete space information
   */
  async getUserSpacesComplete(userId) {
    try {
      const db = await get_async_db();
      
      const result = await db.query(
        `SELECT 
          s.*,
          us.joined_at,
          CASE WHEN s.admin_user_id = $1 THEN true ELSE false END as is_admin
        FROM ${this.userSpaceTableName} us
        JOIN ${this.tableName} s ON us.space_id = s.id
        WHERE us.user_id = $1
        ORDER BY us.joined_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting user spaces complete', { 
        error: error.message, 
        stack: error.stack, 
        userId 
      });
      throw error;
    }
  }
}

module.exports = SpaceRepository;
