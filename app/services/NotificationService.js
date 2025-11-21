const { Notification, NotificationTypes, NotificationStatus } = require('../models/Notification');
const NotificationRepository = require('../repositories/NotificationRepository');
const UserRepository = require('../repositories/UserRepository');
const SpaceRepository = require('../repositories/SpaceRepository');
const { logger } = require('../utils/logger');

/**
 * NotificationService Class
 * Contains business logic for notification operations
 */
class NotificationService {
  constructor() {
    this.notificationRepository = new NotificationRepository();
    this.userRepository = new UserRepository();
    this.spaceRepository = new SpaceRepository();
  }

  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data object
   * @returns {Promise<{success: boolean, notification?: Notification, errors?: string[]}>}
   */
  async createNotification(notificationData) {
    try {
      logger.info('Creating new notification', { 
        userId: notificationData.userId, 
        type: notificationData.type 
      });

      // Create notification instance
      const notification = new Notification(notificationData);

      // Validate notification data
      const validation = notification.validate();
      if (!validation.isValid) {
        logger.warn('Notification validation failed', { errors: validation.errors });
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Check if user exists
      const user = await this.userRepository.findById(notification.userId);
      if (!user) {
        logger.warn('User not found for notification', { userId: notification.userId });
        return {
          success: false,
          errors: ['User not found']
        };
      }

      // Create notification in database
      const createdNotification = await this.notificationRepository.create(notification);
      if (!createdNotification) {
        logger.error('Failed to create notification in database');
        return {
          success: false,
          errors: ['Failed to create notification']
        };
      }

      logger.info('Notification created successfully', { notification_id: createdNotification.id });
      return {
        success: true,
        notification: createdNotification
      };
    } catch (error) {
      logger.error('Error in createNotification service', { 
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
   * Get notification by ID
   * @param {string} notificationId - Notification ID
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<{success: boolean, notification?: Notification, error?: string}>}
   */
  async getNotificationById(notificationId, requestingUserId) {
    try {
      logger.debug('Getting notification by ID', { notification_id: notificationId });

      if (!notificationId) {
        return {
          success: false,
          error: 'Notification ID is required'
        };
      }

      const notification = await this.notificationRepository.findById(notificationId);
      if (!notification) {
        logger.warn('Notification not found', { notification_id: notificationId });
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      // Check if requesting user owns this notification
      // if (notification.userId !== requestingUserId) {
      //   logger.warn('User not authorized to view notification', { 
      //     notification_id: notificationId, 
      //     requestingUserId 
      //   });
      //   return {
      //     success: false,
      //     error: 'Not authorized to view this notification'
      //   };
      // }

      return {
        success: true,
        notification: notification
      };
    } catch (error) {
      logger.error('Error in getNotificationById service', { 
        error: error.message, 
        stack: error.stack, 
        notification_id: notificationId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get notifications for user
   * @param {string} userId - User ID
   * @param {Object} options - Query options (filters, pagination)
   * @returns {Promise<{success: boolean, notifications?: Notification[], error?: string}>}
   */
  async getNotificationsForUser(userId, options = {}) {
    try {
      // const { filters = {}, limit = null, offset = 0 } = options;
      // logger.debug('Getting notifications for user', { userId, filters, limit, offset });

      const { type, status, isActive, limit = 50, offset = 0 } = options;
      const repoFilters = {};
      if (type) repoFilters.type = type;
      if (status) repoFilters.status = status;
      if (isActive !== undefined) {
           repoFilters.isActive = String(isActive).toLowerCase() === 'true';
      }
  
      logger.debug('Getting notifications for user', { userId, filters: repoFilters, limit: parseInt(limit), offset: parseInt(offset) }); 

      if (!userId) {
        return {
          success: false,
          error: 'User ID is required'
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

      const { notifications, totalCount } = await this.notificationRepository.findByUserId(
  userId, 
  repoFilters, 
  parseInt(limit), 
  parseInt(offset) 
);

return {
  success: true,
  notifications: notifications,
  totalCount: totalCount // Pass this total count up
};
    } catch (error) {
      logger.error('Error in getNotificationsForUser service', { 
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

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<{success: boolean, notification?: Notification, error?: string}>}
   */
  async markAsRead(notificationId, requestingUserId) {
    try {
      logger.info('Marking notification as read', { notification_id: notificationId });

      if (!notificationId || !requestingUserId) {
        return {
          success: false,
          error: 'Notification ID and requesting user ID are required'
        };
      }

      // Get notification
      const notification = await this.notificationRepository.findById(notificationId);
      if (!notification) {
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      // Check if requesting user owns this notification
      if (notification.userId !== requestingUserId) {
        return {
          success: false,
          error: 'Not authorized to modify this notification'
        };
      }

      // Mark as read
      notification.markAsRead();

      // Update in database
      const updatedNotification = await this.notificationRepository.update(notification);
      if (!updatedNotification) {
        logger.error('Failed to update notification in database');
        return {
          success: false,
          error: 'Failed to mark notification as read'
        };
      }

      logger.info('Notification marked as read successfully', { notification_id: notificationId });
      return {
        success: true,
        notification: updatedNotification
      };
    } catch (error) {
      logger.error('Error in markAsRead service', {
        error: error.message, 
        stack: error.stack, 
        notification_id: notificationId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Mark notification as dismissed
   * @param {string} notificationId - Notification ID
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<{success: boolean, notification?: Notification, error?: string}>}
   */
  async dismissNotification(notificationId, requestingUserId) {
    try {
      logger.info('Dismissing notification', { notification_id: notificationId });

      if (!notificationId || !requestingUserId) {
        return {
          success: false,
          error: 'Notification ID and requesting user ID are required'
        };
      }

      // Get notification
      const notification = await this.notificationRepository.findById(notificationId);
      if (!notification) {
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      // Check if requesting user owns this notification
      if (notification.userId !== requestingUserId) {
        return {
          success: false,
          error: 'Not authorized to modify this notification'
        };
      }

      // Dismiss notification
      notification.dismiss();

      // Update in database
      const updatedNotification = await this.notificationRepository.update(notification);
      if (!updatedNotification) {
        logger.error('Failed to update notification in database');
        return {
          success: false,
          error: 'Failed to dismiss notification'
        };
      }

      logger.info('Notification dismissed successfully', { notification_id: notificationId });
      return {
        success: true,
        notification: updatedNotification
      };
    } catch (error) {
      logger.error('Error in dismissNotification service', { 
        error: error.message, 
        stack: error.stack, 
        notification_id: notificationId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Mark all notifications as read for user
   * @param {string} userId - User ID
   * @param {string} type - Optional notification type filter
   * @returns {Promise<{success: boolean, count?: number, error?: string}>}
   */
  async markAllAsReadForUser(userId, type = null) {
    try {
      logger.info('Marking all notifications as read for user', { userId, type });

      if (!userId) {
        return {
          success: false,
          error: 'User ID is required'
        };
      }

      

      const count = await this.notificationRepository.markAllAsReadForUser(userId, type);

      logger.info('All notifications marked as read for user', { userId, type, count });
      return {
        success: true,
        count: count
      };
    } catch (error) {
      logger.error('Error in markAllAsReadForUser service', { 
        error: error.message, 
        stack: error.stack, 
        userId, 
        type 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteNotification(notificationId, requestingUserId) {
    try {
      logger.info('Attempting to delete notification', { notification_id: notificationId, requestingUserId });

      if (!notificationId || !requestingUserId) {
        return {
          success: false,
          error: 'Notification ID and requesting user ID are required'
        };
      }

      // Get notification
      const notification = await this.notificationRepository.findById(notificationId);
      if (!notification) {
        logger.warn('Admin attempted to delete non-existent notification', { notification_id: notificationId, requestingUserId });
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      // Check if requesting user owns this notification
      // if (notification.userId !== requestingUserId) {
      //   return {
      //     success: false,
      //     error: 'Not authorized to delete this notification'
      //   };
      // }

      const success = await this.notificationRepository.delete(notificationId);
      if (!success) {
        logger.warn('Notification not found during admin deletion attempt (race condition?)', { notification_id: notificationId, requestingUserId });
        return {
          success: false,
          error: 'Notification not found or already deleted'
        };
      }

      logger.info('Notification deleted successfully by admin', { notification_id: notificationId, adminUserId: requestingUserId });
      return {
        success: true
      };
    } catch (error) {
      logger.error('Error in admin deleteNotification service', { 
        error: error.message, 
        stack: error.stack, 
        notification_id: notificationId,
        requestingUserId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Send space invitation notification
   * @param {string} spaceId - Space ID
   * @param {string} inviteeUserId - User ID to invite
   * @param {string} inviterUserId - User ID of inviter
   * @param {Date} expiresAt - Optional expiration date
   * @returns {Promise<{success: boolean, notification?: Notification, error?: string}>}
   */
  async sendSpaceInvitation(spaceId, inviteeUserId, inviterUserId, expiresAt = null) {
    try {
      logger.info('Sending space invitation', { spaceId, inviteeUserId, inviterUserId });

      if (!spaceId || !inviteeUserId || !inviterUserId) {
        return {
          success: false,
          error: 'Space ID, invitee user ID, and inviter user ID are required'
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

      // Get inviter user
      const inviter = await this.userRepository.findById(inviterUserId);
      if (!inviter) {
        return {
          success: false,
          error: 'Inviter user not found'
        };
      }

      // Get invitee user
      const invitee = await this.userRepository.findById(inviteeUserId);
      if (!invitee) {
        return {
          success: false,
          error: 'Invitee user not found'
        };
      }

      // Check if inviter has permission to invite (is admin or member of space)
      if (!space.isAdmin(inviterUserId) && !space.hasUser(inviterUserId)) {
        return {
          success: false,
          error: 'Not authorized to send invitations for this space'
        };
      }

      // Check if invitee is already in the space
      if (space.hasUser(inviteeUserId)) {
        return {
          success: false,
          error: 'User is already in this space'
        };
      }

      // Create space invitation notification
      const notification = Notification.createSpaceInvite(
        inviteeUserId,
        spaceId,
        space.name,
        inviter.username,
        expiresAt
      );

      // Create notification in database
      const createdNotification = await this.notificationRepository.create(notification);
      if (!createdNotification) {
        logger.error('Failed to create space invitation notification');
        return {
          success: false,
          error: 'Failed to send space invitation'
        };
      }

      logger.info('Space invitation sent successfully', { 
        spaceId, 
        inviteeUserId, 
        inviterUserId,
        notification_id: createdNotification.id 
      });
      return {
        success: true,
        notification: createdNotification
      };
    } catch (error) {
      logger.error('Error in sendSpaceInvitation service', { 
        error: error.message, 
        stack: error.stack, 
        spaceId, 
        inviteeUserId, 
        inviterUserId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Send space update notification to all users in space
   * @param {string} spaceId - Space ID
   * @param {string} updateMessage - Update message
   * @param {string} senderUserId - User ID of sender (optional)
   * @returns {Promise<{success: boolean, notifications?: Notification[], error?: string}>}
   */
  async sendSpaceUpdateNotification(spaceId, updateMessage, senderUserId = null) {
    try {
      logger.info('Sending space update notification', { spaceId, senderUserId });

      if (!spaceId || !updateMessage) {
        return {
          success: false,
          error: 'Space ID and update message are required'
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

      // Create notifications for all users in the space
      const notifications = [];
      for (const userId of space.userIds) {
        // Skip sender if specified
        if (senderUserId && userId === senderUserId) {
          continue;
        }

        const notification = Notification.createSpaceUpdate(
          userId,
          spaceId,
          space.name,
          updateMessage
        );

        notifications.push(notification);
      }

      // Create notifications in database
      const createdNotifications = await this.notificationRepository.createMany(notifications);

      logger.info('Space update notifications sent successfully', { 
        spaceId, 
        count: createdNotifications.length 
      });
      return {
        success: true,
        notifications: createdNotifications
      };
    } catch (error) {
      logger.error('Error in sendSpaceUpdateNotification service', { 
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
   * Get notification count for user
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters (type, status, isActive)
   * @returns {Promise<{success: boolean, count?: number, error?: string}>}
   */
  async getNotificationCountForUser(userId, filters = {}) {
    try {
      logger.debug('Getting notification count for user', { userId, filters });

      if (!userId) {
        return {
          success: false,
          error: 'User ID is required'
        };
      }

      const count = await this.notificationRepository.getCountForUser(userId, filters);
      
      return {
        success: true,
        count: count
      };
    } catch (error) {
      logger.error('Error in getNotificationCountForUser service', { 
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

  /**
   * Clean up expired notifications
   * @returns {Promise<{success: boolean, count?: number, error?: string}>}
   */
  async cleanupExpiredNotifications() {
    try {
      logger.info('Cleaning up expired notifications');

      const count = await this.notificationRepository.deleteExpired();

      logger.info('Expired notifications cleaned up', { count });
      return {
        success: true,
        count: count
      };
    } catch (error) {
      logger.error('Error in cleanupExpiredNotifications service', { 
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
   * Send general update notification to user
   * @param {string} userId - User ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} data - Additional data
   * @returns {Promise<{success: boolean, notification?: Notification, error?: string}>}
   */
  async sendGeneralUpdate(userId, title, message, data = null) {
    try {
      logger.info('Sending general update notification', { userId, title });

      if (!userId || !title || !message) {
        return {
          success: false,
          error: 'User ID, title, and message are required'
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

      // Create general update notification
      const notification = Notification.createGeneralUpdate(userId, title, message, data);

      // Create notification in database
      const createdNotification = await this.notificationRepository.create(notification);
      if (!createdNotification) {
        logger.error('Failed to create general update notification');
        return {
          success: false,
          error: 'Failed to send notification'
        };
      }

      logger.info('General update notification sent successfully', { 
        userId, 
        notification_id: createdNotification.id 
      });
      return {
        success: true,
        notification: createdNotification
      };
    } catch (error) {
      logger.error('Error in sendGeneralUpdate service', { 
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

  /**
   * Get user notifications with pagination and filtering
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<{success: boolean, notifications?: Array, totalCount?: number, hasMore?: boolean, error?: string}>}
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        type,
        status,
        limit = 50,
        offset = 0,
        includeExpired = false
      } = options;

      logger.info('Getting user notifications', { userId, options });

      const result = await this.getNotificationsForUser(userId, {
        type,
        status,
        limit,
        offset,
        includeExpired
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        notifications: result.notifications,
        totalCount: result.totalCount,
        hasMore: result.hasMore
      };
    } catch (error) {
      logger.error('Error in getUserNotifications service', { 
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

  /**
   * Mark notification as unread
   * @param {string} notificationId - Notification ID
   * @param {string} requestingUserId - User making the request
   * @returns {Promise<{success: boolean, notification?: Notification, error?: string}>}
   */
  async markAsUnread(notificationId, requestingUserId) {
    try {
      logger.info('Marking notification as unread', { notificationId, requestingUserId });

      // Get notification
      const notification = await this.notificationRepository.findById(notificationId);
      if (!notification) {
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      // Check if user owns the notification
      if (notification.userId !== requestingUserId) {
        return {
          success: false,
          error: 'Not authorized to modify this notification'
        };
      }

      // Update notification status
      const updatedNotification = await this.notificationRepository.updateStatus(
        notificationId, 
        NotificationStatus.UNREAD
      );

      if (!updatedNotification) {
        return {
          success: false,
          error: 'Failed to update notification'
        };
      }

      logger.info('Notification marked as unread', { notificationId, requestingUserId });

      return {
        success: true,
        notification: updatedNotification
      };
    } catch (error) {
      logger.error('Error in markAsUnread service', { 
        error: error.message, 
        stack: error.stack, 
        notificationId, 
        requestingUserId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }



  

  /**
   * Update notification (admin only)
   * @param {string} notificationId - Notification ID
   * @param {Object} updates - Update data
   * @param {string} requestingUserId - Admin user making the request
   * @returns {Promise<{success: boolean, notification?: Notification, error?: string}>}
   */
  async updateNotification(notificationId, updates, requestingUserId) {
    const requestingUser = await this.userRepository.findById(requestingUserId);
if (!requestingUser || !requestingUser.isAdmin()) {
  logger.warn('Non-admin user attempted admin action', { requestingUserId });
  return {
    success: false,
    error: 'Not authorized'
  };
}
    try {
      logger.info('Updating notification (Admin)', { notificationId, updates, requestingUserId }); 

      // Get notification
      const notificationInstance = await this.notificationRepository.findById(notificationId);
      if (!notificationInstance) {
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      notificationInstance.update(updates);

      const validation = notificationInstance.validate();
      if (!validation.isValid) {
          logger.warn('Admin Notification update validation failed', { notificationId, errors: validation.errors });
      }
      const updatedNotification = await this.notificationRepository.update(notificationInstance);

      // Update notification
      // const updatedNotification = await this.notificationRepository.update(
      //   notificationId, 
      //   updates
      // );

      if (!updatedNotification) {
        logger.error('Failed to update notification in database after applying changes', { notificationId });
        return {
          success: false,
          error: 'Failed to save updated notification'
        };
      }

      logger.info('Notification updated successfully by admin', { notificationId, requestingUserId }); 

      return {
        success: true,
        notification: updatedNotification
      };
    } catch (error) {
      logger.error('Error in admin updateNotification service', { 
        error: error.message, 
        stack: error.stack, 
        notificationId, 
        requestingUserId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get all notifications (admin only)
   * @param {Object} filters - Filter options
   * @param {string} requestingUserId - Admin user making the request
   * @returns {Promise<{success: boolean, notifications?: Array, totalCount?: number, hasMore?: boolean, error?: string}>}
   */
  async getAllNotifications(filters = {}, requestingUserId, paginationOptions = {}) {
    const requestingUser = await this.userRepository.findById(requestingUserId);
if (!requestingUser || !requestingUser.isAdmin()) {
  logger.warn('Non-admin user attempted admin action', { requestingUserId });
  return {
    success: false,
    error: 'Not authorized'
  };
}
    try {
      const { limit = 50, offset = 0 } = paginationOptions;

      const parsedLimit = parseInt(limit, 10);
      const parsedOffset = parseInt(offset, 10);

      logger.info('Admin getting all notifications (Service)', { filters, limit: parsedLimit, offset: parsedOffset, requestingUserId });

     
      const repoResult = await this.notificationRepository.findAll(
        filters,
        parsedLimit,
        parsedOffset
      );

      if (!repoResult || !Array.isArray(repoResult.notifications) || typeof repoResult.totalCount !== 'number') {
           logger.error('Repository findAll (admin) did not return expected object structure', { repoResult });
           return { success: false, error: 'Internal server error retrieving data structure' };
      }

      const { notifications, totalCount } = repoResult;

      const hasMore = (parsedOffset + notifications.length) < totalCount;

      logger.info('Admin successfully retrieved all notifications', {
          count: notifications.length,
          totalMatching: totalCount,
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore
      });

      return {
        success: true,
        notifications: notifications, 
        totalCount: totalCount,   
        hasMore: hasMore  
      };
    } catch (error) {
      logger.error('Error in getAllNotifications service', { 
        error: error.message, 
        stack: error.stack, 
        requestingUserId,
        filters, 
        paginationOptions
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Bulk update notifications (admin only)
   * @param {Array<string>} notificationIds - Array of notification IDs
   * @param {Object} updates - Update data
   * @param {string} requestingUserId - Admin user making the request
   * @returns {Promise<{success: boolean, updatedCount?: number, error?: string}>}
   */
  async bulkUpdateNotifications(notificationIds, updates, requestingUserId) {
    const requestingUser = await this.userRepository.findById(requestingUserId);
if (!requestingUser || !requestingUser.isAdmin()) {
  logger.warn('Non-admin user attempted admin action', { requestingUserId });
  return {
    success: false,
    error: 'Not authorized'
  };
}
    try {
      logger.info('Bulk updating notifications', { 
        notificationIds, 
        updates, 
        requestingUserId 
      });

      const result = await this.notificationRepository.bulkUpdate(
        notificationIds, 
        updates
      );

      if (!result.success) {
        return result;
      }

      logger.info('Notifications bulk updated successfully', { 
        updatedCount: result.updatedCount, 
        requestingUserId 
      });

      return {
        success: true,
        updatedCount: result.updatedCount
      };
    } catch (error) {
      logger.error('Error in bulkUpdateNotifications service', { 
        error: error.message, 
        stack: error.stack, 
        requestingUserId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Bulk delete notifications (admin only)
   * @param {Array<string>} notificationIds - Array of notification IDs
   * @param {string} requestingUserId - Admin user making the request
   * @returns {Promise<{success: boolean, deletedCount?: number, error?: string}>}
   */
  async bulkDeleteNotifications(notificationIds, requestingUserId) {
    const requestingUser = await this.userRepository.findById(requestingUserId);
if (!requestingUser || !requestingUser.isAdmin()) {
  logger.warn('Non-admin user attempted admin action', { requestingUserId });
  return {
    success: false,
    error: 'Not authorized'
  };
}
    try {
      logger.info('Bulk deleting notifications', { 
        notificationIds, 
        requestingUserId 
      });

      const result = await this.notificationRepository.bulkDelete(notificationIds);

      if (!result.success) {
        return result;
      }

      logger.info('Notifications bulk deleted successfully', { 
        deletedCount: result.deletedCount, 
        requestingUserId 
      });

      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      logger.error('Error in bulkDeleteNotifications service', { 
        error: error.message, 
        stack: error.stack, 
        requestingUserId 
      });
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
module.exports = notificationService;
