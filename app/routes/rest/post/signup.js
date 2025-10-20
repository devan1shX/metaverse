const express = require('express');
const { logger } = require('../../../utils/logger');
const { signup_controller } = require('../../../controllers/signup');
const { 
    validateSignup, 
    rateLimitAuth, 
    sanitizeAuthRequest, 
    logAuthAttempt 
} = require('../../../middleware/authValidation');

const signup_routes = express.Router();
function addpath(req, res, next){
    req.body.path="signup";
    next()
}
// Apply middleware in order: sanitize -> rate limit -> validate -> log -> controller
signup_routes.post('/', 
    addpath,
    sanitizeAuthRequest,
    rateLimitAuth(100, 10 * 60 * 1000), // 3 signup attempts per 10 minutes (stricter than login)
    validateSignup,
    logAuthAttempt,
    signup_controller
);

// Health check for signup API
signup_routes.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Signup API is healthy",
        timestamp: new Date().toISOString(),
        rateLimit: {
            maxAttempts: 3,
            windowMinutes: 10
        },
        validation: {
            username: "3-30 characters, alphanumeric with _ and -",
            email: "Valid email format required",
            password: "Minimum 6 characters with strength requirements"
        }
    });
});

module.exports = { signup_routes };
