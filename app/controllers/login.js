const { logger } = require('../utils/logger');
const authService = require('../services/AuthService');

// =============================================  // 

async function login_controller(req, res) {
    try {
        const { user_level, email, password } = req.body;

        const result = await authService.login({ email, password, user_level });
        return res.status(result.statusCode).json(result.body);

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
