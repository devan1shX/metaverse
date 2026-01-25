const UserService = require('../services/UserService');
const { logger } = require('../utils/logger');

// Use UserService singleton instance
const userService = new UserService();

/**
 * Update user avatar controller
 */
async function update_avatar_controller(req, res) {
    try {
        const { id } = req.params;
        const { avatarUrl } = req.body;

        if (!avatarUrl) {
            return res.status(400).json({ 
                success: false,
                message: "avatarUrl is required" 
            });
        }

        logger.info('User avatar update attempt', { userId: id, avatarUrl });
        
        const result = await userService.updateUserAvatar(id, avatarUrl);

        if (!result.success) {
            const statusCode = result.error === 'User not found' ? 404 : 400;
            return res.status(statusCode).json({ 
                success: false,
                message: result.error 
            });
        }

        return res.status(200).json({ 
            success: true,
            message: "Avatar updated successfully", 
            user: result.user.toSafeObject() 
        });

    } catch (error) {
        logger.error('Avatar update controller error', { error: error.message, stack: error.stack });
        return res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
}

/**
 * Update username controller
 */
async function update_username_controller(req, res) {
    try {
        const { id } = req.params;
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ 
                success: false,
                message: "Username is required" 
            });
        }

        logger.info('User username update attempt', { userId: id, username });
        
        const result = await userService.updateUsername(id, username);

        if (!result.success) {
            const statusCode = result.error === 'User not found' ? 404 : 400;
            return res.status(statusCode).json({ 
                success: false,
                message: result.error 
            });
        }

        return res.status(200).json({ 
            success: true,
            message: "Username updated successfully", 
            user: result.user.toSafeObject() 
        });

    } catch (error) {
        logger.error('Username update controller error', { error: error.message, stack: error.stack });
        return res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
}

/**
 * Get user by ID controller
 */
async function get_user_controller(req, res) {
    try {
        const { id } = req.params;

        logger.info('Get user attempt', { userId: id });
        
        const result = await userService.getUserSafeData(id);

        if (!result.success) {
            const statusCode = result.error === 'User not found' ? 404 : 400;
            return res.status(statusCode).json({ 
                success: false,
                message: result.error 
            });
        }

        return res.status(200).json({ 
            success: true,
            user: result.user 
        });

    } catch (error) {
        logger.error('Get user controller error', { error: error.message, stack: error.stack });
        return res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
}

/**
 * Get all users controller
 */
async function get_all_users_controller(req, res) {
    try {
        const { role, isActive, limit, offset } = req.query;
        
        const filters = {};
        if (role) filters.role = role;
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        const options = {
            filters,
            limit: limit ? parseInt(limit) : null,
            offset: offset ? parseInt(offset) : 0
        };

        logger.info('Get all users attempt', { filters, limit, offset });
        
        const result = await userService.getAllUsers(options);

        if (!result.success) {
            return res.status(400).json({ 
                success: false,
                message: result.error 
            });
        }

        // Convert users to safe objects (without passwords)
        const safeUsers = result.users.map(user => user.toSafeObject());

        return res.status(200).json({ 
            success: true,
            users: safeUsers,
            count: safeUsers.length
        });

    } catch (error) {
        logger.error('Get all users controller error', { error: error.message, stack: error.stack });
        return res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
}

/**
 * Update user controller
 */
async function update_user_controller(req, res) {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Remove sensitive fields that shouldn't be updated via this endpoint
        delete updateData.password;
        delete updateData.id;

        logger.info('Update user attempt', { userId: id, updateData });
        
        const result = await userService.updateUser(id, updateData);

        if (!result.success) {
            const statusCode = result.errors && result.errors.includes('User not found') ? 404 : 400;
            return res.status(statusCode).json({ 
                success: false,
                message: result.errors ? result.errors.join(', ') : result.error
            });
        }

        return res.status(200).json({ 
            success: true,
            message: "User updated successfully", 
            user: result.user.toSafeObject() 
        });

    } catch (error) {
        logger.error('Update user controller error', { error: error.message, stack: error.stack });
        return res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
}

/**
 * Deactivate user controller
 */
async function deactivate_user_controller(req, res) {
    try {
        const { id } = req.params;

        logger.info('Deactivate user attempt', { userId: id });
        
        const result = await userService.deactivateUser(id);

        if (!result.success) {
            const statusCode = result.error === 'User not found' ? 404 : 400;
            return res.status(statusCode).json({ 
                success: false,
                message: result.error 
            });
        }

        return res.status(200).json({ 
            success: true,
            message: "User deactivated successfully"
        });

    } catch (error) {
        logger.error('Deactivate user controller error', { error: error.message, stack: error.stack });
        return res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
}

module.exports = {
    update_avatar_controller,
    get_user_controller,
    get_all_users_controller,
    update_user_controller,
    update_username_controller,
    deactivate_user_controller,
    
    // Export UserService instance for direct access if needed
    userService
};