const { logger } = require('../utils/logger');
const { Config } = require('../config/config');

/**
 * Validation middleware for user login
 */
function validateLogin(req, res, next) {
    const { user_level, email, password } = req.body;
    const errors = [];

    // Validate user_level
    if (!user_level) {
        errors.push('User level is required');
    } else if (typeof user_level !== 'string') {
        errors.push('User level must be a string');
    } else {
        const validUserLevels = Object.values(Config.USER_LEVELS);
        if (!validUserLevels.includes(user_level.toLowerCase())) {
            errors.push(`User level must be one of: ${validUserLevels.join(', ')}`);
        }
    }

    // Validate email
    if (!email) {
        errors.push('Email is required');
    } else if (typeof email !== 'string') {
        errors.push('Email must be a string');
    } else {
        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            errors.push('Please provide a valid email address');
        } else if (email.trim().length > 254) {
            errors.push('Email address is too long');
        }
    }

    // Validate password
    if (!password) {
        errors.push('Password is required');
    } else if (typeof password !== 'string') {
        errors.push('Password must be a string');
    } else if (password.length < 1) {
        errors.push('Password cannot be empty');
    } else if (password.length > 128) {
        errors.push('Password is too long (max 128 characters)');
    }

    if (errors.length > 0) {
        logger.warn('Login validation failed', { 
            errors, 
            email: email?.substring(0, 3) + '***', // Partially hide email in logs
            user_level,
            ip: req.ip 
        });
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    // Sanitize and normalize data
    req.body.email = email.trim().toLowerCase();
    req.body.user_level = user_level.trim().toLowerCase();
    req.body.password = password; // Don't trim password as it might be intentional

    next();
}

/**
 * Validation middleware for user signup
 */
function validateSignup(req, res, next) {
    const { user_name, email, password, confirmPassword } = req.body;
    const errors = [];

    // Validate username
    if (!user_name) {
        errors.push('Username is required');
    } else if (typeof user_name !== 'string') {
        errors.push('Username must be a string');
    } else {
        const trimmedUsername = user_name.trim();
        if (trimmedUsername.length < 3) {
            errors.push('Username must be at least 3 characters long');
        } else if (trimmedUsername.length > 30) {
            errors.push('Username must be less than 30 characters');
        } else if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
            errors.push('Username can only contain letters, numbers, underscores, and hyphens');
        }
    }

    // Validate email
    if (!email) {
        errors.push('Email is required');
    } else if (typeof email !== 'string') {
        errors.push('Email must be a string');
    } else {
        const trimmedEmail = email.trim();
        // Comprehensive email validation
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(trimmedEmail)) {
            errors.push('Please provide a valid email address');
        } else if (trimmedEmail.length > 254) {
            errors.push('Email address is too long');
        }
    }

    // Validate password
    if (!password) {
        errors.push('Password is required');
    } else if (typeof password !== 'string') {
        errors.push('Password must be a string');
    } else {
        if (password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        } else if (password.length > 128) {
            errors.push('Password is too long (max 128 characters)');
        }
        
        // Password strength validation
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
        
        if (strengthScore < 2) {
            errors.push('Password must contain at least 2 of the following: uppercase letters, lowercase letters, numbers, special characters');
        }
        
        // Check for common weak passwords
        const commonPasswords = ['password', '123456', 'password123', 'admin', 'qwerty', 'letmein'];
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('Please choose a stronger password');
        }
    }

    // Validate password confirmation if provided
    if (confirmPassword !== undefined) {
        if (confirmPassword !== password) {
            errors.push('Password confirmation does not match');
        }
    }

    if (errors.length > 0) {
        logger.warn('Signup validation failed', { 
            errors, 
            username: user_name?.substring(0, 3) + '***',
            email: email?.substring(0, 3) + '***',
            ip: req.ip 
        });
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    // Sanitize and normalize data
    req.body.user_name = user_name.trim();
    req.body.email = email.trim().toLowerCase();
    // Don't modify password as it might affect hashing

    next();
}

/**
 * Rate limiting middleware for authentication attempts
 */
const authAttempts = new Map(); // In production, use Redis or database

function rateLimitAuth(maxAttempts = 5, windowMs = 15 * 60 * 1000) { // 5 attempts per 15 minutes
    return (req, res, next) => {
        const clientId = req.ip + (req.body.email || '');
        const now = Date.now();
        
        // Clean up old entries
        for (const [key, data] of authAttempts.entries()) {
            if (now - data.firstAttempt > windowMs) {
                authAttempts.delete(key);
            }
        }
        
        const attempts = authAttempts.get(clientId);
        
        if (attempts) {
            if (attempts.count >= maxAttempts) {
                const timeLeft = Math.ceil((attempts.firstAttempt + windowMs - now) / 1000 / 60);
                logger.warn('Rate limit exceeded for auth attempt', { 
                    clientId: clientId.substring(0, 10) + '***',
                    attempts: attempts.count,
                    timeLeft 
                });
                return res.status(429).json({
                    success: false,
                    message: `Too many authentication attempts. Please try again in ${timeLeft} minutes.`,
                    retryAfter: timeLeft
                });
            }
            attempts.count++;
        } else {
            authAttempts.set(clientId, {
                count: 1,
                firstAttempt: now
            });
        }
        
        next();
    };
}

/**
 * Middleware to sanitize request body for security
 */
function sanitizeAuthRequest(req, res, next) {
    // Remove any potentially dangerous fields
    const allowedFields = {
        login: ['user_level', 'email', 'password'],
        signup: ['user_name', 'email', 'password', 'confirmPassword']
    };
    
    const routeType = req.path.includes('signup') ? 'signup' : 'login';
    const allowed = allowedFields[routeType];
    
    // Create sanitized body with only allowed fields
    const sanitizedBody = {};
    for (const field of allowed) {
        if (req.body[field] !== undefined) {
            sanitizedBody[field] = req.body[field];
        }
    }
    
    req.body = sanitizedBody;
    
    // Add security headers
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
    });
    
    next();
}

/**
 * Middleware to log authentication attempts
 */
function logAuthAttempt(req, res, next) {
    const startTime = Date.now();
    
    // Override res.json to log the response
    const originalJson = res.json;
    res.json = function(body) {
        const duration = Date.now() - startTime;
        const isSuccess = body.success !== false && res.statusCode < 400;
        
        logger.info('Authentication attempt completed', {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            email: req.body.email?.substring(0, 3) + '***',
            success: isSuccess,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
        
        return originalJson.call(this, body);
    };
    
    next();
}

module.exports = {
    validateLogin,
    validateSignup,
    rateLimitAuth,
    sanitizeAuthRequest,
    logAuthAttempt
};
