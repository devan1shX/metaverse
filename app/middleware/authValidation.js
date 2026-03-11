const { logger } = require('../utils/logger');
const redisClient = require('../config/redis_config');
const { validateLogin, validateSignup, getAllowedFields } = require('../services/ValidationService');

// =============================================  //
// Thin validation middleware – delegates to ValidationService
// =============================================  //

/**
 * Middleware: validate login input via ValidationService.
 */
function validateLoginRequest(req, res, next) {
    const { valid, errors, sanitized } = validateLogin(req.body);

    if (!valid) {
        logger.warn('Login validation failed', {
            errors,
            email: req.body.email?.substring(0, 3) + '***',
            user_level: req.body.user_level,
            ip: req.ip,
        });
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors,
        });
    }

    // Replace body with sanitized values
    req.body = sanitized;
    next();
}

/**
 * Middleware: validate signup input via ValidationService.
 */
function validateSignupRequest(req, res, next) {
    const { valid, errors, sanitized } = validateSignup(req.body);

    if (!valid) {
        logger.warn('Signup validation failed', {
            errors,
            username: req.body.user_name?.substring(0, 3) + '***',
            email: req.body.email?.substring(0, 3) + '***',
            ip: req.ip,
        });
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors,
        });
    }

    // Replace body with sanitized values
    req.body = sanitized;
    next();
}

// =============================================  //
// Sanitisation
// =============================================  //

/**
 * Middleware to strip unexpected fields from the request body.
 * Uses `req.body.path` (set by route-level `addpath`) to determine allowed fields.
 */
function sanitizeAuthRequest(req, res, next) {
    const routeType = req.body.path;
    const allowed = getAllowedFields(routeType);

    if (allowed.length > 0) {
        const sanitizedBody = {};
        for (const field of allowed) {
            if (req.body[field] !== undefined) {
                sanitizedBody[field] = req.body[field];
            }
        }
        req.body = sanitizedBody;
    }

    logger.debug('Sanitized request body', { fields: Object.keys(req.body) });
    next();
}

// =============================================  //
// Rate limiting (Redis)
// =============================================  //

/**
 * Rate limiting middleware for authentication attempts (using Redis).
 */
function rateLimitAuth(maxAttempts = process.env.RATE_LIMIT_MAX_ATTEMPTS, windowMs = process.env.RATE_LIMIT_WINDOW_MS) {
    const windowInSeconds = Math.ceil(windowMs / 1000);

    return async (req, res, next) => {
        const clientId = `rate-limit:auth:${req.ip}:${req.body.email || ''}`;

        try {
            if (!redisClient.isReady) {
                logger.error('Redis client not ready, skipping rate limit');
                return next();
            }

            const attempts = await redisClient.incr(clientId);
            console.log(attempts , maxAttempts);
            if (attempts === 1) {
                await redisClient.expire(clientId, windowInSeconds);
            }

            if (attempts > maxAttempts) {
                const ttl = await redisClient.ttl(clientId);
                const timeLeft = Math.ceil(ttl / 60);

                logger.warn('Rate limit exceeded for auth attempt', {
                    clientId: `rate-limit:auth:${req.ip}:${req.body.email?.substring(0, 3) + '***'}`,
                    attempts,
                    timeLeft,
                });

                return res.status(429).json({
                    success: false,
                    message: `Too many authentication attempts. Please try again in ${timeLeft} minutes.`,
                    retryAfter: timeLeft,
                });
            }

            next();
        } catch (error) {
            logger.error('Redis rate limiter error', { error: error.message, stack: error.stack });
            // Fail open (allow request) if Redis fails
            next();
        }
    };
}

// =============================================  //
// Logging
// =============================================  //

/**
 * Middleware to log authentication attempts.
 */
function logAuthAttempt(req, res, next) {
    const startTime = Date.now();

    const originalJson = res.json;
    res.json = function (body) {
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
            duration: `${duration}ms`,
        });

        return originalJson.call(this, body);
    };

    next();
}

module.exports = {
    validateLoginRequest,
    validateSignupRequest,
    rateLimitAuth,
    sanitizeAuthRequest,
    logAuthAttempt,
};
