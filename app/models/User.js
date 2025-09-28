const uuid4 = require('uuid4');
const bcrypt = require('bcrypt');

class User {
  constructor({
    id = null,
    username,
    email,
    password = null,
    role = 'participant',
    designation = 'None',
    avatarUrl = '/avatars/avatar1.png',
    about = null,
    isActive = true,
    createdAt = null,
    updatedAt = null,
    spaceIds = [],
    notifications = []
  } = {}) {
    this.id = id || uuid4();
    this.username = username;
    this.email = email;
    this.password = password;
    this.role = role;
    this.designation = designation;
    this.avatarUrl = avatarUrl;
    this.about = about;
    this.isActive = isActive;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    this.spaceIds = spaceIds || [];
    this.notifications = notifications || [];
  }

  /**
   * Validate user data
   * @returns {Object} validation result with isValid boolean and errors array
   */
  validate() {
    const errors = [];
    if (!this.username || this.username.trim().length === 0) {
      errors.push('Username is required');
    } else if (this.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    } else if (this.username.length > 100) {
      errors.push('Username must be less than 100 characters');
    }

    if (!this.email || this.email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(this.email)) {
      errors.push('Invalid email format');
    } else if (this.email.length > 255) {
      errors.push('Email must be less than 255 characters');
    }

    if (this.password !== null) {
      if (!this.password || this.password.length === 0) {
        errors.push('Password is required');
      } else if (this.password.length < 6) {
        errors.push('Password must be at least 6 characters long');
      }
    }

    const validRoles = ['admin', 'participant', 'moderator'];
    if (!validRoles.includes(this.role)) {
      errors.push('Invalid role. Must be one of: ' + validRoles.join(', '));
    }

    if (this.avatarUrl && this.avatarUrl.length > 255) {
      errors.push('Avatar URL must be less than 255 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Hash the user's password
   * @param {number} saltRounds - Number of salt rounds for bcrypt
   * @returns {Promise<void>}
   */
  async hashPassword(saltRounds = 10) {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }

  /**
   * Verify password against hash
   * @param {string} plainPassword - Plain text password to verify
   * @returns {Promise<boolean>}
   */
  async verifyPassword(plainPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(plainPassword, this.password);
  }

  /**
   * Convert user to safe object (without password)
   * @returns {Object} User object without sensitive data
   */
  toSafeObject() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      designation: this.designation,
      avatarUrl: this.avatarUrl,
      about: this.about,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      spaceIds: this.spaceIds,
      spaceCount: this.getSpaceCount(),
      unreadNotifications: this.getUnreadNotificationsCount(),
      notifications: this.notifications.map(n => n.toSafeObject())
    };
  }

  /**
   * Convert user to database object
   * @returns {Object} User object formatted for database operations
   */
  toDatabaseObject() {
    return {
      id: this.id,
      user_name: this.username,
      email: this.email,
      password: this.password,
      role: this.role,
      user_designation: this.designation,
      user_avatar_url: this.avatarUrl,
      user_about: this.about,
      user_is_active: this.isActive,
      user_created_at: this.createdAt,
      user_updated_at: this.updatedAt
    };
  }

  /**
   * Create User instance from database row
   * @param {Object} dbRow - Database row object
   * @param {Array} spaceIds - Array of space IDs for this user
   * @param {Array} notifications - Array of notifications for this user
   * @returns {User} User instance
   */
  static fromDatabaseRow(dbRow, spaceIds = [], notifications = []) {
    if (!dbRow) return null;
    
    return new User({
      id: dbRow.id,
      username: dbRow.user_name,
      email: dbRow.email,
      password: dbRow.password,
      role: dbRow.role,
      designation: dbRow.user_designation,
      avatarUrl: dbRow.user_avatar_url,
      about: dbRow.user_about,
      isActive: dbRow.user_is_active,
      createdAt: dbRow.user_created_at,
      updatedAt: dbRow.user_updated_at,
      spaceIds: spaceIds,
      notifications: notifications
    });
  }

  /**
   * Update user properties
   * @param {Object} updates - Object containing fields to update
   */
  update(updates) {
    const allowedUpdates = [
      'username', 'email', 'role', 'designation', 
      'avatarUrl', 'about', 'isActive'
    ];

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key) && updates[key] !== undefined) {
        this[key] = updates[key];
      }
    });

    this.updatedAt = new Date();
  }

  /**
   * Add space to user's space list
   * @param {string} spaceId - Space ID to add
   * @returns {boolean} Success status
   */
  addSpace(spaceId) {
    if (!spaceId || this.spaceIds.includes(spaceId)) {
      return false;
    }
    this.spaceIds.push(spaceId);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Remove space from user's space list
   * @param {string} spaceId - Space ID to remove
   * @returns {boolean} Success status
   */
  removeSpace(spaceId) {
    const index = this.spaceIds.indexOf(spaceId);
    if (index === -1) {
      return false;
    }
    this.spaceIds.splice(index, 1);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Check if user is in a specific space
   * @param {string} spaceId - Space ID to check
   * @returns {boolean}
   */
  isInSpace(spaceId) {
    return this.spaceIds.includes(spaceId);
  }

  /**
   * Get user's space count
   * @returns {number}
   */
  getSpaceCount() {
    return this.spaceIds.length;
  }

  /**
   * Add notification to user
   * @param {Notification} notification - Notification to add
   * @returns {boolean} Success status
   */
  addNotification(notification) {
    if (!notification || !notification.id) {
      return false;
    }
    
    // Check if notification already exists
    const existingIndex = this.notifications.findIndex(n => n.id === notification.id);
    if (existingIndex !== -1) {
      return false;
    }

    this.notifications.push(notification);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Remove notification from user
   * @param {string} notificationId - Notification ID to remove
   * @returns {boolean} Success status
   */
  removeNotification(notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index === -1) {
      return false;
    }
    this.notifications.splice(index, 1);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Get unread notifications count
   * @returns {number}
   */
  getUnreadNotificationsCount() {
    return this.notifications.filter(n => n.isUnread() && n.isActiveNotification()).length;
  }

  /**
   * Get notifications by type
   * @param {string} type - Notification type
   * @returns {Array} Array of notifications
   */
  getNotificationsByType(type) {
    return this.notifications.filter(n => n.type === type && n.isActiveNotification());
  }

  /**
   * Mark all notifications as read
   * @returns {number} Number of notifications marked as read
   */
  markAllNotificationsAsRead() {
    let count = 0;
    this.notifications.forEach(notification => {
      if (notification.isUnread()) {
        notification.markAsRead();
        count++;
      }
    });
    if (count > 0) {
      this.updatedAt = new Date();
    }
    return count;
  }

  /**
   * Check if user has specific role
   * @param {string} role - Role to check
   * @returns {boolean}
   */
  hasRole(role) {
    return this.role === role;
  }

  /**
   * Check if user is admin
   * @returns {boolean}
   */
  isAdmin() {
    return this.role === 'admin';
  }

  /**
   * Check if user is active
   * @returns {boolean}
   */
  isActiveUser() {
    return this.isActive === true;
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  getSpaces() {
    return this.spaceIds;
  }
  getNotifications() {
    return this.notifications;
  }
}

module.exports = User;
