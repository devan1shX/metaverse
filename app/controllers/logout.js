const express = require('express')
const jwt = require('jsonwebtoken')
const { logger } = require('../utils/logger')
const { Config } = require('../config/config')
const { get_async_db } = require('../config/db_conn')

// In-memory token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set();

/**
 * Add token to blacklist
 * @param {string} token - JWT token to blacklist
 * @param {number} exp - Token expiration timestamp
 */
async function addToBlacklist(token, exp) {
    try {
        // Add to in-memory blacklist
        tokenBlacklist.add(token);
        
        // Also store in database for persistence across server restarts
        const db = await get_async_db();
        await db.query(
            `INSERT INTO blacklisted_tokens (token, expires_at, created_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (token) DO NOTHING`,
            [token, new Date(exp * 1000)]
        );
        
        logger.debug('Token added to blacklist', { tokenLength: token.length });
    } catch (error) {
        logger.error('Error adding token to blacklist', { error: error.message });
        // Continue with logout even if blacklisting fails
    }
}

/**
 * Check if token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is blacklisted
 */
function isTokenBlacklisted(token) {
    return tokenBlacklist.has(token);
}

/**
 * Clean up expired tokens from blacklist
 */
async function cleanupExpiredTokens() {
    try {
        const db = await get_async_db();
        await db.query('DELETE FROM blacklisted_tokens WHERE expires_at < NOW()');
        logger.debug('Cleaned up expired blacklisted tokens');
    } catch (error) {
        logger.error('Error cleaning up expired tokens', { error: error.message });
    }
}

// Clean up expired tokens every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

async function log_out_router(req, res) {
    try {
        // Extract token from Authorization header (Bearer TOKEN)
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        let user_info = null;

        if (!token) {
            logger.warn('Logout attempt without token');
            return res.status(400).json({
                message: "No token provided",
                note: "Authorization header with Bearer token is required"
            });
        }

        try {
            // Verify token
            user_info = jwt.verify(token, Config.JWT_SECRET);
            
            // Check if token is already blacklisted
            if (isTokenBlacklisted(token)) {
                logger.warn('Logout attempt with already blacklisted token', { 
                    user_id: user_info.user_id 
                });
                return res.status(401).json({
                    message: "Token already invalidated"
                });
            }

            // Add token to blacklist
            await addToBlacklist(token, user_info.exp);

            logger.info('User logout successful', { 
                user_id: user_info.user_id, 
                email: user_info.email,
                role: user_info.role 
            });

            return res.status(200).json({
                message: "Logout successful",
                user_id: user_info.user_id,
                logged_out_at: new Date().toISOString()
            });

        } catch (jwtError) {
            logger.warn('Invalid token during logout', { error: jwtError.message });
            return res.status(401).json({
                message: "Invalid token",
                error: "Token verification failed"
            });
        }

    } catch (error) {
        logger.error('Logout error', { error: error.message, stack: error.stack });
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
    log_out_router,
    isTokenBlacklisted,
    addToBlacklist,
    cleanupExpiredTokens
}
