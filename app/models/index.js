// Models index file for easy importing
const User = require('./User');
const Space = require('./Space');
const { Notification, NotificationTypes, NotificationStatus } = require('./Notification');

module.exports = {
  User,
  Space,
  Notification,
  NotificationTypes,
  NotificationStatus
};
