const { logger } = require('../utils/logger');
const UserService = require('../services/UserService');
const { UserRepository } = require('../repositories');
const NotificationService = require('../services/NotificationService');
userRepository = new UserRepository();
userservice = new UserService();
const dashboard_controller = async (req, res) => {
    // fetch the user notifications and the spaces of the user 
    const user_id = req.user.user_id;
    const user_spaces = await userRepository.getUserSpaces(user_id);
    
    // const user_notifications = await userRepository.getUserNotifications(user_id);
    const user_notifications = await NotificationService.getNotificationsForUser(user_id);
    
   logger.info('Dashboard data retrieved successfully', { user_id } );
   return res.status(200).json({ message: 'Dashboard data retrieved successfully', "user_notifications":user_notifications, "user_spaces":user_spaces })
};
 
module.exports = { dashboard_controller };
