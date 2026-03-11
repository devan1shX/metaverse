const { logger } = require('../utils/logger');
const authService = require('../services/AuthService');

async function log_out_router(req, res) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        const result = await authService.logout(token);
        return res.status(result.statusCode).json(result.body);
    } catch (error) {
        logger.error('Logout error', { error: error.message, stack: error.stack });
        return res.status(500).json({ 
            success: false,
            message: "Internal server error",
            errors: ["An unexpected error occurred during logout"]
        });
    }
}

module.exports = {
    log_out_router,
}
