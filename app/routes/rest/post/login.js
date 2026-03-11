// login routes for all the users will be here 

const express = require('express');
const { logger } = require('../../../utils/logger');
const { login_controller } = require('../../../controllers/login');
const { 
    validateLoginRequest, 
    rateLimitAuth, 
    sanitizeAuthRequest, 
    logAuthAttempt 
} = require('../../../middleware/authValidation');

const login_routes = express.Router();

function addpath(req, res, next){
    req.body.path="login";
    next()
}
login_routes.post('/', 
    addpath,
    sanitizeAuthRequest,
    rateLimitAuth(process.env.RATE_LIMIT_MAX_ATTEMPTS, process.env.RATE_LIMIT_WINDOW_MS), // 5 attempts per 15 minutes
    validateLoginRequest,
    logAuthAttempt,
    login_controller
);

login_routes.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: "Login API is healthy",
        timestamp: new Date().toISOString(),
        rateLimit: {
            maxAttempts: process.env.RATE_LIMIT_MAX_ATTEMPTS,
            windowMinutes: process.env.RATE_LIMIT_WINDOW_MS / 60000
        }
    });
});

module.exports = { login_routes };