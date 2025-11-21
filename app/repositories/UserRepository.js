const { get_async_db } = require('../config/db_conn');
const { logger } = require('../utils/logger');
const User = require('../models/User');
const { Notification } = require('../models/Notification');

/**
 * UserRepository Class
 * Handles all database operations for User entities
 */
class UserRepository {
  constructor() {
    this.tableName = 'users';
  }

  /**
   * Create a new user in the database
   * @param {User} user - User instance to create
   * @returns {Promise<User|null>} Created user or null if failed
   */
  async create(user) {
    try {
      const db = await get_async_db();
      const dbObject = user.toDatabaseObject();
      
      logger.debug('Creating user in database', { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      });

      const result = await db.query(
        `INSERT INTO ${this.tableName} (
          id, user_name, email, password, role, user_designation,
          user_avatar_url, user_about, user_is_active, user_created_at, user_updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          dbObject.id,
          dbObject.user_name,
          dbObject.email,
          dbObject.password,
          dbObject.role,
          dbObject.user_designation,
          dbObject.user_avatar_url,
          dbObject.user_about,
          dbObject.user_is_active,
          dbObject.user_created_at,
          dbObject.user_updated_at
        ]
      );

      if (result.rows.length > 0) {
        logger.info('User created successfully in database', { 
          user_id: user.id, 
          username: user.username 
        });
        return User.fromDatabaseRow(result.rows[0]);
      }

      return null;
    } catch (error) {
      logger.error('Error creating user in database', { 
        error: error.message, 
        stack: error.stack, 
        username: user.username, 
        email: user.email 
      });
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Promise<User|null>} User instance or null if not found
   */
  async findById(id) {
    try {
      const db = await get_async_db();
      logger.debug('Finding user by ID', { user_id: id });

      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id = $1`,
        [id]
      );

      if (result.rows.length > 0) {
        logger.debug('User found by ID', { user_id: id });
        return User.fromDatabaseRow(result.rows[0]);
      }

      logger.warn('User not found by ID', { user_id: id });
      return null;
    } catch (error) {
      logger.error('Error finding user by ID', { 
        error: error.message, 
        stack: error.stack, 
        user_id: id 
      });
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>} User instance or null if not found
   */
  async findByEmail(email) {
    try {
      const db = await get_async_db();
      logger.debug('Finding user by email', { email });

      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE email = $1`,
        [email]
      );

      if (result.rows.length > 0) {
        logger.debug('User found by email', { email });
        return User.fromDatabaseRow(result.rows[0]);
      }

      logger.warn('User not found by email', { email });
      return null;
    } catch (error) {
      logger.error('Error finding user by email', { 
        error: error.message, 
        stack: error.stack, 
        email 
      });
      throw error;
    }
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<User|null>} User instance or null if not found
   */
  async findByUsername(username) {
    try {
      const db = await get_async_db();
      logger.debug('Finding user by username', { username });

      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE user_name = $1`,
        [username]
      );

      if (result.rows.length > 0) {
        logger.debug('User found by username', { username });
        return User.fromDatabaseRow(result.rows[0]);
      }

      logger.warn('User not found by username', { username });
      return null;
    } catch (error) {
      logger.error('Error finding user by username', { 
        error: error.message, 
        stack: error.stack, 
        username 
      });
      throw error;
    }
  }

  /**
   * Get all users with optional filters
   * @param {Object} filters - Optional filters (role, isActive, etc.)
   * @param {number} limit - Optional limit
   * @param {number} offset - Optional offset for pagination
   * @returns {Promise<User[]>} Array of User instances
   */
  async findAll(filters = {}, limit = null, offset = 0) {
    try {
      const db = await get_async_db();
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      // Build WHERE conditions
      if (filters.role) {
        conditions.push(`role = $${params.length + 1}`);
        params.push(filters.role);
      }

      if (filters.isActive !== undefined) {
        conditions.push(`user_is_active = $${params.length + 1}`);
        params.push(filters.isActive);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Add ordering
      query += ` ORDER BY user_created_at DESC`;

      // Add pagination
      if (limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(limit);
      }

      if (offset > 0) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(offset);
      }

      logger.debug('Finding all users', { filters, limit, offset });

      const result = await db.query(query, params);
      
      logger.info('Users fetched', { count: result.rows.length });
      return result.rows.map(row => User.fromDatabaseRow(row));
    } catch (error) {
      logger.error('Error finding all users', { 
        error: error.message, 
        stack: error.stack, 
        filters 
      });
      throw error;
    }
  }

  /**
   * Update user in database
   * @param {User} user - User instance with updated data
   * @returns {Promise<User|null>} Updated user or null if not found
   */
  async update(user) {
    try {
      const db = await get_async_db();
      const dbObject = user.toDatabaseObject();
      
      logger.debug('Updating user in database', { user_id: user.id });

      const result = await db.query(
        `UPDATE ${this.tableName} SET
          user_name = $2,
          email = $3,
          role = $4,
          user_designation = $5,
          user_avatar_url = $6,
          user_about = $7,
          user_is_active = $8,
          user_updated_at = $9
        WHERE id = $1
        RETURNING *`,
        [
          user.id,
          dbObject.user_name,
          dbObject.email,
          dbObject.role,
          dbObject.user_designation,
          dbObject.user_avatar_url,
          dbObject.user_about,
          dbObject.user_is_active,
          new Date()
        ]
      );

      if (result.rows.length > 0) {
        logger.info('User updated successfully', { user_id: user.id });
        return User.fromDatabaseRow(result.rows[0]);
      }

      logger.warn('User not found for update', { user_id: user.id });
      return null;
    } catch (error) {
      logger.error('Error updating user', { 
        error: error.message, 
        stack: error.stack, 
        user_id: user.id 
      });
      throw error;
    }
  }

  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} hashedPassword - New hashed password
   * @returns {Promise<boolean>} Success status
   */
  async updatePassword(userId, hashedPassword) {
    try {
      const db = await get_async_db();
      logger.debug('Updating user password', { user_id: userId });

      const result = await db.query(
        `UPDATE ${this.tableName} SET
          password = $2,
          user_updated_at = NOW()
        WHERE id = $1`,
        [userId, hashedPassword]
      );

      const success = result.rowCount > 0;
      if (success) {
        logger.info('User password updated successfully', { user_id: userId });
      } else {
        logger.warn('User not found for password update', { user_id: userId });
      }

      return success;
    } catch (error) {
      logger.error('Error updating user password', { 
        error: error.message, 
        stack: error.stack, 
        user_id: userId 
      });
      throw error;
    }
  }

  /**
   * Delete user (soft delete by setting isActive to false)
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async softDelete(userId) {
    try {
      const db = await get_async_db();
      logger.debug('Soft deleting user', { user_id: userId });

      const result = await db.query(
        `UPDATE ${this.tableName} SET
          user_is_active = false,
          user_updated_at = NOW()
        WHERE id = $1`,
        [userId]
      );

      const success = result.rowCount > 0;
      if (success) {
        logger.info('User soft deleted successfully', { user_id: userId });
      } else {
        logger.warn('User not found for soft delete', { user_id: userId });
      }

      return success;
    } catch (error) {
      logger.error('Error soft deleting user', { 
        error: error.message, 
        stack: error.stack, 
        user_id: userId 
      });
      throw error;
    }
  }

  /**
   * Hard delete user (permanently remove from database)
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async hardDelete(userId) {
    try {
      const db = await get_async_db();
      logger.debug('Hard deleting user', { user_id: userId });

      const result = await db.query(
        `DELETE FROM ${this.tableName} WHERE id = $1`,
        [userId]
      );

      const success = result.rowCount > 0;
      if (success) {
        logger.info('User hard deleted successfully', { user_id: userId });
      } else {
        logger.warn('User not found for hard delete', { user_id: userId });
      }

      return success;
    } catch (error) {
      logger.error('Error hard deleting user', { 
        error: error.message, 
        stack: error.stack, 
        user_id: userId 
      });
      throw error;
    }
  }

  /**
   * Check if email exists
   * @param {string} email - Email to check
   * @param {string} excludeUserId - Optional user ID to exclude from check
   * @returns {Promise<boolean>} True if email exists
   */
  async emailExists(email, excludeUserId = null) {
    try {
      const db = await get_async_db();
      let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE email = $1`;
      const params = [email];

      if (excludeUserId) {
        query += ` AND id != $2`;
        params.push(excludeUserId);
      }

      const result = await db.query(query, params);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking email existence', { 
        error: error.message, 
        stack: error.stack, 
        email 
      });
      throw error;
    }
  }

  /**
   * Check if username exists
   * @param {string} username - Username to check
   * @param {string} excludeUserId - Optional user ID to exclude from check
   * @returns {Promise<boolean>} True if username exists
   */
  async usernameExists(username, excludeUserId = null) {
    try {
      const db = await get_async_db();
      let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE user_name = $1`;
      const params = [username];

      if (excludeUserId) {
        query += ` AND id != $2`;
        params.push(excludeUserId);
      }

      const result = await db.query(query, params);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking username existence', { 
        error: error.message, 
        stack: error.stack, 
        username 
      });
      throw error;
    }
  }

  /**
   * Find users not in a specific space
   * @param {string} spaceId - Space ID
   * @param {string} excludeUserId - User ID to exclude (usually the requesting user)
   * @returns {Promise<User[]>} Array of User instances
   */
  async findUsersNotInSpace(spaceId, excludeUserId = null) {
    try {
      const db = await get_async_db();
      let query = `
        SELECT u.* FROM ${this.tableName} u
        WHERE u.user_is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM user_spaces us 
          WHERE us.user_id = u.id AND us.space_id = $1
        )
      `;
      const params = [spaceId];

      if (excludeUserId) {
        query += ` AND u.id != $2`;
        params.push(excludeUserId);
      }

      query += ` ORDER BY u.user_name`;

      logger.debug('Finding users not in space', { spaceId, excludeUserId });

      const result = await db.query(query, params);
      
      const users = result.rows.map(row => User.fromDatabaseRow(row));
      
      logger.info('Users not in space found', { spaceId, count: users.length });
      return users;
    } catch (error) {
      logger.error('Error finding users not in space', { 
        error: error.message, 
        stack: error.stack, 
        spaceId 
      });
      throw error;
    }
  }

  /**add a space for a user */
  async addSpaceForUser(userid , space){
    try{
      const db = await get_async_db();
      const user = await this.findById(userid);
      if(!user){
        logger.error('User not found', { userid });
        return false;
      }
     
      const existsResult = await db.query(
        `SELECT 1 FROM user_spaces WHERE user_id = $1 AND space_id = $2`,
        [userid, space.id]
      );
      if (existsResult.rows.length > 0) {
        logger.warn('User is already in space', { userid, spaceId: space.id });
        return false;
      }
      const result = await db.query(
        `INSERT INTO user_spaces (user_id, space_id, joined_at)
        VALUES ($1, $2, NOW())`,
        [userid, space.id]
      );
      logger.info('Added user to space', { userid, spaceId: space.id });
      return result.rowCount > 0;
    }catch(error){
    }
  }
  async getUserSpaces(userid){
    const db = await get_async_db();
    const result = await db.query(
      `SELECT 
        us.*,
        s.id as space_id,
        s.name as space_name,
        s.description as space_description,
        s.map_image_url as space_map_image_url,
        s.admin_user_id as space_admin_user_id,
        s.is_public as space_is_public,
        s.max_users as space_max_users,
        s.is_active as space_is_active,
        s.count as space_count,
        s.created_at as space_created_at,
        s.updated_at as space_updated_at,
        s.objects as space_objects,
        CASE WHEN s.admin_user_id = $1 THEN true ELSE false END as is_admin
      FROM user_spaces us
      JOIN spaces s ON us.space_id = s.id
      WHERE us.user_id = $1
      ORDER BY us.joined_at DESC`,
      [userid]
    );
    
    return result.rows;
  }
  async getUserNotifications(userid){
    const db = await get_async_db();
    const result = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1`,
      [userid]
    );
    return result.rows;
  }
}

module.exports = UserRepository;
