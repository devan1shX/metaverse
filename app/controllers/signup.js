const { logger } = require('../utils/logger');
const authService = require('../services/AuthService');

async function signup_controller(req, res) {
    try {
        const { user_name, email, password } = req.body;

        const result = await authService.signup({ user_name, email, password });
        return res.status(result.statusCode).json(result.body);

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
