const { get_async_db } = require('../config/db_conn');
const { logger } = require('../utils/logger');
const { Notification, NotificationTypes, NotificationStatus } = require('../models/Notification');

/**
 * NotificationRepository Class
 * Handles all database operations for Notification entities
 */
class NotificationRepository {
  constructor() {
    this.tableName = 'notifications';
  }

  /**
   * Create a new notification in the database
   * @param {Notification} notification - Notification instance to create
   * @returns {Promise<Notification|null>} Created notification or null if failed
   */
  async create(notification) {
    try {
      const db = await get_async_db();
      const dbObject = notification.toDatabaseObject();
      
      logger.debug('Creating notification in database', { 
        id: notification.id, 
        userId: notification.userId, 
        type: notification.type 
      });

      const result = await db.query(
        `INSERT INTO ${this.tableName} (
          id, user_id, type, title, message, data, status,
          is_active, created_at, updated_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          dbObject.id,
          dbObject.user_id,
          dbObject.type,
          dbObject.title,
          dbObject.message,
          dbObject.data,
          dbObject.status,
          dbObject.is_active,
          dbObject.created_at,
          dbObject.updated_at,
          dbObject.expires_at
        ]
      );

      if (result.rows.length > 0) {
        logger.info('Notification created successfully in database', { 
          notification_id: notification.id, 
          userId: notification.userId 
        });
        return Notification.fromDatabaseRow(result.rows[0]);
      }

      return null;
    } catch (error) {
      logger.error('Error creating notification in database', { 
        error: error.message, 
        stack: error.stack, 
        userId: notification.userId 
      });
      throw error;
    }
  }

  /**
   * Find notification by ID
   * @param {string} id - Notification ID
   * @returns {Promise<Notification|null>} Notification instance or null if not found
   */
  async findById(id) {
    try {
      const db = await get_async_db();
      logger.debug('Finding notification by ID', { notification_id: id });

      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id = $1`,
        [id]
      );

      if (result.rows.length > 0) {
        logger.debug('Notification found by ID', { notification_id: id });
        return Notification.fromDatabaseRow(result.rows[0]);
      }

      logger.warn('Notification not found by ID', { notification_id: id });
      return null;
    } catch (error) {
      logger.error('Error finding notification by ID', { 
        error: error.message, 
        stack: error.stack, 
        notification_id: id 
      });
      throw error;
    }
  }

  /**
   * Find notifications by user ID
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters (type, status, isActive)
   * @param {number} limit - Optional limit
   * @param {number} offset - Optional offset for pagination
   * @returns {Promise<Notification[]>} Array of Notification instances
   */
  async findByUserId(userId, filters = {}, limit = null, offset = 0) {
    try {
      const db = await get_async_db();
      let query = `SELECT * FROM ${this.tableName} WHERE user_id = $1`;
      const params = [userId];
      const conditions = [];

      // Build additional WHERE conditions
      if (filters.type) {
        conditions.push(`type = $${params.length + 1}`);
        params.push(filters.type);
      }

      if (filters.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      if (filters.isActive !== undefined) {
        conditions.push(`is_active = $${params.length + 1}`);
        params.push(filters.isActive);
      }

      // Add conditions to query
      if (conditions.length > 0) {
        query += ` AND ${conditions.join(' AND ')}`;
      }

      // Add ordering (newest first)
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

      logger.debug('Finding notifications by user ID', { userId, filters, limit, offset });

      const result = await db.query(query, params);
      
      const notifications = result.rows.map(row => Notification.fromDatabaseRow(row));
      
      logger.info('Notifications fetched for user', { 
        userId, 
        count: notifications.length 
      });
      return notifications;
    } catch (error) {
      logger.error('Error finding notifications by user ID', { 
        error: error.message, 
        stack: error.stack, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Get all notifications with optional filters
   * @param {Object} filters - Optional filters (type, status, isActive, userId)
   * @param {number} limit - Optional limit
   * @param {number} offset - Optional offset for pagination
   * @returns {Promise<Notification[]>} Array of Notification instances
   */
  async findAll(filters = {}, limit = null, offset = 0) {
    try {
      const db = await get_async_db();
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      const conditions = [];

      // Build WHERE conditions
      if (filters.userId) {
        conditions.push(`user_id = $${params.length + 1}`);
        params.push(filters.userId);
      }

      if (filters.type) {
        conditions.push(`type = $${params.length + 1}`);
        params.push(filters.type);
      }

      if (filters.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      if (filters.isActive !== undefined) {
        conditions.push(`is_active = $${params.length + 1}`);
        params.push(filters.isActive);
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

      logger.debug('Finding all notifications', { filters, limit, offset });

      const result = await db.query(query, params);
      
      const notifications = result.rows.map(row => Notification.fromDatabaseRow(row));
      
      logger.info('All notifications fetched', { count: notifications.length });
      return notifications;
    } catch (error) {
      logger.error('Error finding all notifications', { 
        error: error.message, 
        stack: error.stack, 
        filters 
      });
      throw error;
    }
  }

  /**
   * Update notification in database
   * @param {Notification} notification - Notification instance with updated data
   * @returns {Promise<Notification|null>} Updated notification or null if not found
   */
  async update(notification) {
    try {
      const db = await get_async_db();
      const dbObject = notification.toDatabaseObject();
      
      logger.debug('Updating notification in database', { notification_id: notification.id });

      const result = await db.query(
        `UPDATE ${this.tableName} SET
          title = $2,
          message = $3,
          data = $4,
          status = $5,
          is_active = $6,
          updated_at = $7,
          expires_at = $8
        WHERE id = $1
        RETURNING *`,
        [
          notification.id,
          dbObject.title,
          dbObject.message,
          dbObject.data,
          dbObject.status,
          dbObject.is_active,
          new Date(),
          dbObject.expires_at
        ]
      );

      if (result.rows.length > 0) {
        logger.info('Notification updated successfully', { notification_id: notification.id });
        return Notification.fromDatabaseRow(result.rows[0]);
      }

      logger.warn('Notification not found for update', { notification_id: notification.id });
      return null;
    } catch (error) {
      logger.error('Error updating notification', { 
        error: error.message, 
        stack: error.stack, 
        notification_id: notification.id 
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<boolean>} Success status
   */
  async markAsRead(notificationId) {
    try {
      const db = await get_async_db();
      logger.debug('Marking notification as read', { notification_id: notificationId });

      const result = await db.query(
        `UPDATE ${this.tableName} SET
          status = $2,
          updated_at = NOW()
        WHERE id = $1`,
        [notificationId, NotificationStatus.READ]
      );

      const success = result.rowCount > 0;
      if (success) {
        logger.info('Notification marked as read successfully', { notification_id: notificationId });
      } else {
        logger.warn('Notification not found for mark as read', { notification_id: notificationId });
      }

      return success;
    } catch (error) {
      logger.error('Error marking notification as read', { 
        error: error.message, 
        stack: error.stack, 
        notification_id: notificationId 
      });
      throw error;
    }
  }

  /**
   * Mark notification as dismissed
   * @param {string} notificationId - Notification ID
   * @returns {Promise<boolean>} Success status
   */
  async markAsDismissed(notificationId) {
    try {
      const db = await get_async_db();
      logger.debug('Marking notification as dismissed', { notification_id: notificationId });

      const result = await db.query(
        `UPDATE ${this.tableName} SET
          status = $2,
          updated_at = NOW()
        WHERE id = $1`,
        [notificationId, NotificationStatus.DISMISSED]
      );

      const success = result.rowCount > 0;
      if (success) {
        logger.info('Notification marked as dismissed successfully', { notification_id: notificationId });
      } else {
        logger.warn('Notification not found for mark as dismissed', { notification_id: notificationId });
      }

      return success;
    } catch (error) {
      logger.error('Error marking notification as dismissed', { 
        error: error.message, 
        stack: error.stack, 
        notification_id: notificationId 
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @param {string} type - Optional notification type filter
   * @returns {Promise<number>} Number of notifications marked as read
   */
  async markAllAsReadForUser(userId, type = null) {
    try {
      const db = await get_async_db();
      let query = `UPDATE ${this.tableName} SET
        status = $2,
        updated_at = NOW()
      WHERE user_id = $1 AND status = $3`;
      const params = [userId, NotificationStatus.READ, NotificationStatus.UNREAD];

      if (type) {
        query += ` AND type = $4`;
        params.push(type);
      }

      logger.debug('Marking all notifications as read for user', { userId, type });

      const result = await db.query(query, params);

      logger.info('Notifications marked as read for user', { 
        userId, 
        type, 
        count: result.rowCount 
      });
      return result.rowCount;
    } catch (error) {
      logger.error('Error marking all notifications as read for user', { 
        error: error.message, 
        stack: error.stack, 
        userId, 
        type 
      });
      throw error;
    }
  }

  /**
   * Delete notification (hard delete)
   * @param {string} notificationId - Notification ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(notificationId) {
    try {
      const db = await get_async_db();
      logger.debug('Deleting notification', { notification_id: notificationId });

      const result = await db.query(
        `DELETE FROM ${this.tableName} WHERE id = $1`,
        [notificationId]
      );

      const success = result.rowCount > 0;
      if (success) {
        logger.info('Notification deleted successfully', { notification_id: notificationId });
      } else {
        logger.warn('Notification not found for deletion', { notification_id: notificationId });
      }

      return success;
    } catch (error) {
      logger.error('Error deleting notification', { 
        error: error.message, 
        stack: error.stack, 
        notification_id: notificationId 
      });
      throw error;
    }
  }

  /**
   * Delete expired notifications
   * @returns {Promise<number>} Number of notifications deleted
   */
  async deleteExpired() {
    try {
      const db = await get_async_db();
      logger.debug('Deleting expired notifications');

      const result = await db.query(
        `DELETE FROM ${this.tableName} 
         WHERE expires_at IS NOT NULL AND expires_at <= NOW()`
      );

      logger.info('Expired notifications deleted', { count: result.rowCount });
      return result.rowCount;
    } catch (error) {
      logger.error('Error deleting expired notifications', { 
        error: error.message, 
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Get notification count for user
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters (type, status, isActive)
   * @returns {Promise<number>} Count of notifications
   */
  async getCountForUser(userId, filters = {}) {
    try {
      const db = await get_async_db();
      let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE user_id = $1`;
      const params = [userId];
      const conditions = [];

      // Build additional WHERE conditions
      if (filters.type) {
        conditions.push(`type = $${params.length + 1}`);
        params.push(filters.type);
      }

      if (filters.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      if (filters.isActive !== undefined) {
        conditions.push(`is_active = $${params.length + 1}`);
        params.push(filters.isActive);
      }

      // Add conditions to query
      if (conditions.length > 0) {
        query += ` AND ${conditions.join(' AND ')}`;
      }

      const result = await db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting notification count for user', { 
        error: error.message, 
        stack: error.stack, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Create multiple notifications (bulk insert)
   * @param {Notification[]} notifications - Array of notification instances
   * @returns {Promise<Notification[]>} Array of created notifications
   */
  async createMany(notifications) {
    if (!notifications || notifications.length === 0) {
      return [];
    }

    const db = await get_async_db();
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.debug('Creating multiple notifications', { count: notifications.length });

      const createdNotifications = [];
      
      for (const notification of notifications) {
        const dbObject = notification.toDatabaseObject();
        
        const result = await client.query(
          `INSERT INTO ${this.tableName} (
            id, user_id, type, title, message, data, status,
            is_active, created_at, updated_at, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *`,
          [
            dbObject.id,
            dbObject.user_id,
            dbObject.type,
            dbObject.title,
            dbObject.message,
            dbObject.data,
            dbObject.status,
            dbObject.is_active,
            dbObject.created_at,
            dbObject.updated_at,
            dbObject.expires_at
          ]
        );

        if (result.rows.length > 0) {
          createdNotifications.push(Notification.fromDatabaseRow(result.rows[0]));
        }
      }

      await client.query('COMMIT');

      logger.info('Multiple notifications created successfully', { 
        count: createdNotifications.length 
      });
      return createdNotifications;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating multiple notifications', { 
        error: error.message, 
        stack: error.stack 
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = NotificationRepository;
