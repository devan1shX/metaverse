const { logger } = require('../utils/logger');
const UserService = require('../services/UserService');

const dashboard_controller = async (req, res) => {
    // fetch the user notifications and the spaces of the user 
    const user_id = req.user.user_id;
    try{
        const user_notifications_result = await UserService.getUserNotifications(user_id);
        const user_spaces_result = await UserService.getUserSpaces(user_id);
        user_spaces = [];user_notifications = [];
        if(user_notifications_result.status != "User not found"){
            user_notifications = user_notifications_result.notifications;
        }
        if(user_spaces_result.status != "User not found"){
            user_spaces = user_spaces_result.spaces;
        }
    }
    catch(error){
        logger.error('Error in dashboard controller', { error: error.message , filename:"dashboard.js", function:"dashboard_controller"});
        return res.status(500).json({ message: 'Internal server error' });
    }
    
   logger.info('Dashboard data retrieved successfully', { user_id } );
   return res.status(200).json({ message: 'Dashboard data retrieved successfully', user_notifications, user_spaces })
};

module.exports = { dashboard_controller };