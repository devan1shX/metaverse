const uuid4 = require('uuid4');

/**
 * Notification Types Enum
 */
const NotificationTypes = {
  UPDATES: 'updates',
  INVITES: 'invites'
};

/**
 * Notification Status Enum
 */
const NotificationStatus = {
  UNREAD: 'unread',
  READ: 'read',
  DISMISSED: 'dismissed'
};

/**
 * Notification Model Class
 * Represents a notification for users
 */
class Notification {
  constructor({
    id = null,
    userId,
    type,
    title,
    message,
    data = null,
    status = NotificationStatus.UNREAD,
    isActive = true,
    createdAt = null,
    updatedAt = null,
    expiresAt = null
  } = {}) {
    this.id = id || uuid4();
    this.userId = userId;
    this.type = type;
    this.title = title;
    this.message = message;
    this.data = data; // Additional data (e.g., space ID for invites)
    this.status = status;
    this.isActive = isActive;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    this.expiresAt = expiresAt;
  }

  /**
   * Validate notification data
   * @returns {Object} validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];

    // User ID validation
    if (!this.userId || this.userId.trim().length === 0) {
      errors.push('User ID is required');
    }

    // Type validation
    if (!this.type || !Object.values(NotificationTypes).includes(this.type)) {
      errors.push(`Type must be one of: ${Object.values(NotificationTypes).join(', ')}`);
    }

    // Title validation
    if (!this.title || this.title.trim().length === 0) {
      errors.push('Title is required');
    } else if (this.title.length > 100) {
      errors.push('Title must be less than 100 characters');
    }

    // Message validation
    if (!this.message || this.message.trim().length === 0) {
      errors.push('Message is required');
    } else if (this.message.length > 500) {
      errors.push('Message must be less than 500 characters');
    }

    // Status validation
    if (!Object.values(NotificationStatus).includes(this.status)) {
      errors.push(`Status must be one of: ${Object.values(NotificationStatus).join(', ')}`);
    }

    // Expiration validation
    if (this.expiresAt && this.expiresAt <= new Date()) {
      errors.push('Expiration date must be in the future');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Mark notification as read
   */
  markAsRead() {
    this.status = NotificationStatus.READ;
    this.updatedAt = new Date();
  }

  /**
   * Mark notification as dismissed
   */
  dismiss() {
    this.status = NotificationStatus.DISMISSED;
    this.updatedAt = new Date();
  }

  /**
   * Check if notification is unread
   * @returns {boolean}
   */
  isUnread() {
    return this.status === NotificationStatus.UNREAD;
  }

  /**
   * Check if notification is read
   * @returns {boolean}
   */
  isRead() {
    return this.status === NotificationStatus.READ;
  }

  /**
   * Check if notification is dismissed
   * @returns {boolean}
   */
  isDismissed() {
    return this.status === NotificationStatus.DISMISSED;
  }

  /**
   * Check if notification is expired
   * @returns {boolean}
   */
  isExpired() {
    return this.expiresAt && this.expiresAt <= new Date();
  }

  /**
   * Check if notification is active and not expired
   * @returns {boolean}
   */
  isActiveNotification() {
    return this.isActive && !this.isExpired();
  }

  /**
   * Update notification properties
   * @param {Object} updates - Object containing fields to update
   */
  update(updates) {
    const allowedUpdates = [
      'title', 'message', 'data', 'status', 'isActive', 'expiresAt'
    ];

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key) && updates[key] !== undefined) {
        this[key] = updates[key];
      }
    });

    this.updatedAt = new Date();
  }

  /**
   * Convert notification to safe object (for API responses)
   * @returns {Object} Notification object
   */
  toSafeObject() {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      title: this.title,
      message: this.message,
      data: this.data,
      status: this.status,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      expiresAt: this.expiresAt,
      isExpired: this.isExpired()
    };
  }

  /**
   * Convert notification to database object
   * @returns {Object} Notification object formatted for database operations
   */
  toDatabaseObject() {
    return {
      id: this.id,
      user_id: this.userId,
      type: this.type,
      title: this.title,
      message: this.message,
      data: this.data ? JSON.stringify(this.data) : null,
      status: this.status,
      is_active: this.isActive,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      expires_at: this.expiresAt
    };
  }

  /**
   * Create Notification instance from database row
   * @param {Object} dbRow - Database row object
   * @returns {Notification} Notification instance
   */
  static fromDatabaseRow(dbRow) {
    if (!dbRow) return null;
    
    let data = null;
    try {
      data = dbRow.data ? JSON.parse(dbRow.data) : null;
    } catch (error) {
      console.error('Error parsing notification data:', error);
      data = null;
    }

    return new Notification({
      id: dbRow.id,
      userId: dbRow.user_id,
      type: dbRow.type,
      title: dbRow.title,
      message: dbRow.message,
      data: data,
      status: dbRow.status,
      isActive: dbRow.is_active,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at,
      expiresAt: dbRow.expires_at
    });
  }

  /**
   * Create space invite notification
   * @param {string} userId - User ID to send notification to
   * @param {string} spaceId - Space ID
   * @param {string} spaceName - Space name
   * @param {string} inviterName - Name of user who sent invite
   * @param {Date} expiresAt - Optional expiration date
   * @returns {Notification} Notification instance
   */
  static createSpaceInvite(userId, spaceId, spaceName, inviterName, expiresAt = null) {
    return new Notification({
      userId,
      type: NotificationTypes.INVITES,
      title: 'Space Invitation',
      message: `${inviterName} invited you to join "${spaceName}"`,
      data: {
        spaceId,
        spaceName,
        inviterName,
        action: 'space_invite'
      },
      expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days default
    });
  }

  /**
   * Create space update notification
   * @param {string} userId - User ID to send notification to
   * @param {string} spaceId - Space ID
   * @param {string} spaceName - Space name
   * @param {string} updateMessage - Update message
   * @returns {Notification} Notification instance
   */
  static createSpaceUpdate(userId, spaceId, spaceName, updateMessage) {
    return new Notification({
      userId,
      type: NotificationTypes.UPDATES,
      title: 'Space Update',
      message: `Update in "${spaceName}": ${updateMessage}`,
      data: {
        spaceId,
        spaceName,
        action: 'space_update'
      }
    });
  }

  /**
   * Create general update notification
   * @param {string} userId - User ID to send notification to
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} data - Additional data
   * @returns {Notification} Notification instance
   */
  static createGeneralUpdate(userId, title, message, data = null) {
    return new Notification({
      userId,
      type: NotificationTypes.UPDATES,
      title,
      message,
      data
    });
  }
}

// Export the class and enums
module.exports = {
  Notification,
  NotificationTypes,
  NotificationStatus
};
