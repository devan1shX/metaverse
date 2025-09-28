const jwt = require('jsonwebtoken');
const { Config } = require('../config/config');
const { logger } = require('../utils/logger');
const { isTokenBlacklisted } = require('../controllers/logout');

// Middleware to verify JWT tokens
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        logger.warn('Access denied: No token provided', { 
            ip: req.ip, 
            path: req.path,
            method: req.method 
        });
        return res.status(401).json({ 
            message: 'Access denied. No token provided.' 
        });
    }

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
        logger.warn('Access denied: Token is blacklisted', { 
            ip: req.ip, 
            path: req.path,
            method: req.method 
        });
        return res.status(401).json({ 
            message: 'Token has been invalidated. Please login again.' 
        });
    }

    try {
        const decoded = jwt.verify(token, Config.JWT_SECRET);
        req.user = decoded; // Add user info to request object
        req.token = token; // Add token to request for potential blacklisting
        
        logger.info('Token verified successfully', { 
            user_id: decoded.user_id,
            email: decoded.email,
            role: decoded.role,
            path: req.path,
            method: req.method
        });
        
        next(); // Continue to the next middleware/route handler
    } catch (error) {
        logger.warn('Invalid token provided', { 
            error: error.message,
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                message: 'Token expired. Please login again.' 
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                message: 'Invalid token. Please login again.' 
            });
        } else {
            return res.status(401).json({ 
                message: 'Token verification failed.' 
            });
        }
    }
}

// Middleware to check if user has admin role
function requireAdmin(req, res, next) {
    if (!req.user) {
        logger.error('Admin check failed: No user in request', { path: req.path });
        return res.status(401).json({ 
            message: 'Authentication required.' 
        });
    }

    if (req.user.role !== 'admin') {
        logger.warn('Admin access denied', { 
            user_id: req.user.user_id,
            role: req.user.role,
            path: req.path 
        });
        return res.status(403).json({ 
            message: 'Admin access required.' 
        });
    }

    logger.info('Admin access granted', { 
        user_id: req.user.user_id,
        path: req.path 
    });
    next();
}

// Middleware to check if user has participant role (or admin)
function requireParticipant(req, res, next) {
    if (!req.user) {
        logger.error('Participant check failed: No user in request', { path: req.path });
        return res.status(401).json({ 
            message: 'Authentication required.' 
        });
    }

    if (req.user.role !== 'participant' && req.user.role !== 'admin') {
        logger.warn('Participant access denied', { 
            user_id: req.user.user_id,
            role: req.user.role,
            path: req.path 
        });
        return res.status(403).json({ 
            message: 'Participant access required.' 
        });
    }

    logger.info('Participant access granted', { 
        user_id: req.user.user_id,
        role: req.user.role,
        path: req.path 
    });
    next();
}

module.exports = {
    authenticateToken,
    requireAdmin,
    requireParticipant
};
