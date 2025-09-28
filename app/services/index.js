// Services index file for easy importing
// All services are exported as singleton instances
const UserService = require('./UserService');
const SpaceService = require('./SpaceService');
const NotificationService = require('./NotificationService');

module.exports = {
  UserService,
  SpaceService,
  NotificationService
};
