const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const { Config } = require('../config/config');
const UserService = require('../services/UserService');

const userService = new UserService();

async function signup_controller(req, res) {
    try {
        const { user_name, email, password } = req.body;
        
        logger.info('User signup attempt', { 
            username: user_name.substring(0, 3) + '***', 
            email: email.substring(0, 3) + '***' 
        });

        // Prepare user data for UserService
        const userData = {
            username: user_name,
            email: email,
            password: password,
            role: 'participant' // Default role for new signups
        };

        // Use UserService to create user (handles validation, duplicate checking, etc.)
        const result = await userService.createUser(userData);

        if (!result.success) {
            logger.warn('User creation failed', { 
                errors: result.errors,
                email: email.substring(0, 3) + '***' 
            });
            
            // Determine appropriate status code based on error type
            let statusCode = 400;
            if (result.errors && result.errors.some(error => 
                error.includes('already exists') || error.includes('Email already exists')
            )) {
                statusCode = 409; // Conflict
            }
            
            return res.status(statusCode).json({ 
                success: false,
                message: "User creation failed",
                errors: result.errors
            });
        }

        // Generate JWT token for the new user
        const token = jwt.sign(
            { 
                user_id: result.user.id, 
                email: result.user.email, 
                username: result.user.username,
                role: result.user.role
            },
            Config.JWT_SECRET,
            { expiresIn: '24h' } // Match login token expiry
        );
        
        logger.info('User created successfully', { 
            user_id: result.user.id, 
            username: user_name.substring(0, 3) + '***', 
            email: email.substring(0, 3) + '***' 
        });

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            user: result.user.toSafeObject(), // Use safe object method
            token: token
        });

    } catch (error) {
        logger.error('Signup controller error', { 
            error: error.message, 
            stack: error.stack, 
            username: req.body.user_name?.substring(0, 3) + '***', 
            email: req.body.email?.substring(0, 3) + '***' 
        });
        return res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
}

module.exports = { signup_controller };
