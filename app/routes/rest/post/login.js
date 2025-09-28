// login routes for all the users will be here 

const express = require('express');
const { logger } = require('../../../utils/logger');
const { login_controller } = require('../../../controllers/login');
const { 
    validateLogin, 
    rateLimitAuth, 
    sanitizeAuthRequest, 
    logAuthAttempt 
} = require('../../../middleware/authValidation');

const login_routes = express.Router();

// Apply middleware in order: sanitize -> rate limit -> validate -> log -> controller
login_routes.post('/', 
    sanitizeAuthRequest,
    rateLimitAuth(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
    validateLogin,
    logAuthAttempt,
    login_controller
);

// Health check for login API
login_routes.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Login API is healthy",
        timestamp: new Date().toISOString(),
        rateLimit: {
            maxAttempts: 5,
            windowMinutes: 15
        }
    });
});

module.exports = { login_routes };