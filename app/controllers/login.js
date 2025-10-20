const jwt = require('jsonwebtoken');
const { Config } = require('../config/config');
const { USER_LEVELS } = Config;
const { logger } = require('../utils/logger');
const UserService = require('../services/UserService');
const userService = new UserService();
// format for the request body 
// {
//     user_level: string,
//     email: string,
//     password: string,
// }
async function login_controller(req, res) {
    try {
        const { user_level, email, password } = req.body;

        logger.info('[login][login_controller] Login attempt', { user_level, email: email.substring(0, 3) + '***' });

        if (user_level.toLowerCase() === USER_LEVELS.ADMIN) {
            if (email === Config.ADMIN_EMAIL && password === Config.ADMIN_PASSWORD) {
                // Generate JWT token for admin
                const token = jwt.sign(
                    { 
                        user_id: "admin", 
                        email: email, 
                        username: "admin",
                        role: "admin"
                    },
                    Config.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '1h' }
                );
                
                logger.info('[login][login_controller] Admin login successful', { email: email.substring(0, 3) + '***' });
                return res.status(200).json({
                    success: true,
                    message: "Login successful",
                    user_level: "admin",
                    user: {
                        id: "admin",
                        username: "admin",
                        email: email,
                        role: "admin"
                    },
                    token: token
                });
            } else {
                logger.warn('[login][login_controller] Invalid admin credentials', { email: email.substring(0, 3) + '***' });
                return res.status(401).json({
                    success: false,
                    message: "Admin authentication failed",
                    errors: ["Invalid admin email or password"]
                });
            }
        }
        
        if (user_level.toLowerCase() === USER_LEVELS.PARTICIPANT) {
            // Use UserService to authenticate user
            const authResult = await userService.authenticateUser(email, password);
            
            if (!authResult.success) {
                logger.warn('Participant authentication failed', { 
                    email: email.substring(0, 3) + '***',
                    error: authResult.error,
                    errors: authResult.errors
                });
                
                // Determine appropriate status code based on error type
                let statusCode = 401;
                let message = "Authentication failed";
                let errors = [];
                
                if (authResult.errors && authResult.errors.length > 0) {
                    errors = authResult.errors;
                    message = "Login failed";
                    
                    // Check for specific error types
                    if (authResult.errors.some(error => 
                        error.includes('not found') || error.includes('does not exist')
                    )) {
                        statusCode = 404; // Not Found
                    } else if (authResult.errors.some(error => 
                        error.includes('inactive') || error.includes('disabled')
                    )) {
                        statusCode = 403; // Forbidden
                    } else if (authResult.errors.some(error => 
                        error.includes('password') || error.includes('incorrect')
                    )) {
                        statusCode = 401; // Unauthorized
                    }
                } else if (authResult.error) {
                    errors = [authResult.error];
                } else {
                    errors = ["Invalid email or password"];
                }
                
                return res.status(statusCode).json({
                    success: false,
                    message: message,
                    errors: errors
                });
            }

            // Generate JWT token for participant
            const token = jwt.sign(
                { 
                    user_id: authResult.user.id, 
                    email: authResult.user.email, 
                    username: authResult.user.username,
                    role: authResult.user.role
                },
                Config.JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            logger.info('Participant login successful', { 
                email: email.substring(0, 3) + '***', 
                user_id: authResult.user.id 
            });
            
            return res.status(200).json({
                success: true,
                message: "Login successful",
                user_level: "participant",
                user: authResult.user.toSafeObject(), // Use safe object method
                token: token
            });
        }

        logger.warn('Invalid user level provided', { user_level });
        return res.status(400).json({
            success: false,
            message: "Invalid user level provided",
            errors: [`User level must be either '${USER_LEVELS.ADMIN}' or '${USER_LEVELS.PARTICIPANT}'`]
        });

    } catch (error) {
        logger.error('Login controller error', { 
            error: error.message, 
            stack: error.stack 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = { login_controller }
