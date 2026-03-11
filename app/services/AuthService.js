const jwt = require('jsonwebtoken');
const { Config } = require('../config/config');
const { logger } = require('../utils/logger');
const { get_async_db } = require('../config/db_conn');
const UserService = require('./UserService');

const userService = new UserService();

// =============================================  //
// In-memory token blacklist
const tokenBlacklist = new Set();

// =============================================  //
// AuthService – single place for all auth business logic
// =============================================  //

/**
 * Sign a JWT with the app's secret.
 * @param {Object} payload  - Claims to embed (user_id, email, username, role)
 * @param {Object} options  - jwt.sign options, e.g. { expiresIn: '24h' }
 * @returns {string} Signed JWT
 */
function signToken(payload, options = {}) {
    return jwt.sign(payload, Config.JWT_SECRET, options);
}

/**
 * Verify a JWT with the app's secret.
 * @param {string} token
 * @returns {Object} Decoded token payload
 * @throws  If the token is invalid or expired
 */
function verifyToken(token) {
    return jwt.verify(token, Config.JWT_SECRET);
}

// =============================================  //
// Blacklist helpers
// =============================================  //

/**
 * Add a token to the blacklist (in-memory + DB).
 * @param {string} token
 * @param {number} exp - Unix timestamp (seconds) when the token expires
 */
async function addToBlacklist(token, exp) {
    try {
        tokenBlacklist.add(token);

        const db = await get_async_db();
        await db.query(
            `INSERT INTO blacklisted_tokens (token, expires_at, created_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (token) DO NOTHING`,
            [token, new Date(exp * 1000)]
        );

        logger.debug('[AuthService] Token added to blacklist', { tokenLength: token.length });
    } catch (error) {
        logger.error('[AuthService] Error adding token to blacklist', { error: error.message });
        // Continue even if DB insert fails – in-memory set is still updated
    }
}

/**
 * Check whether a token has been blacklisted.
 * Checks in-memory set first, then falls back to DB so blacklisted tokens
 * survive server restarts.
 * @param {string} token
 * @returns {Promise<boolean>}
 */
async function isTokenBlacklisted(token) {
    // Fast path – in-memory
    if (tokenBlacklist.has(token)) {
        return true;
    }

    // Slow path – DB lookup (covers tokens blacklisted before a restart)
    try {
        const db = await get_async_db();
        const result = await db.query(
            `SELECT 1 FROM blacklisted_tokens WHERE token = $1 AND expires_at > NOW() LIMIT 1`,
            [token]
        );
        if (result.rows.length > 0) {
            // Re-hydrate in-memory cache so subsequent checks are fast
            tokenBlacklist.add(token);
            return true;
        }
    } catch (error) {
        logger.error('[AuthService] Error checking blacklist in DB', { error: error.message });
    }

    return false;
}

/**
 * Delete expired tokens from the DB and clear them from the in-memory set.
 */
async function cleanupExpiredTokens() {
    try {
        const db = await get_async_db();
        await db.query('DELETE FROM blacklisted_tokens WHERE expires_at < NOW()');

        // We cannot easily identify which in-memory entries are expired
        // without decoding them, so we leave the set as-is; stale entries
        // only waste a tiny amount of memory and will not cause false positives
        // because JWT verification already rejects expired tokens.
        logger.debug('[AuthService] Cleaned up expired blacklisted tokens');
    } catch (error) {
        logger.error('[AuthService] Error cleaning up expired tokens', { error: error.message });
    }
}

// Run cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

// =============================================  //
// High-level auth flows
// =============================================  //

/**
 * Login flow.
 * @param {{ email: string, password: string, user_level: string }} params
 * @returns {Promise<{ statusCode: number, body: Object }>}
 */
async function login({ email, password, user_level }) {
    const requestedRole = user_level.toLowerCase();

    logger.info('[AuthService][login] Login attempt', {
        user_level,
        email: email.substring(0, 3) + '***',
    });

    // 1. Authenticate credentials via UserService
    const authResult = await userService.authenticateUser(email, password);

    if (!authResult.success) {
        logger.warn('[AuthService][login] Authentication failed', {
            email: email.substring(0, 3) + '***',
            error: authResult.error || (authResult.errors ? authResult.errors.join(', ') : 'Unknown auth error'),
        });

        let statusCode = 401;
        if (authResult.error === 'User not found' || authResult.error === 'Invalid email or password') {
            statusCode = 404;
        } else if (authResult.error === 'Account is deactivated') {
            statusCode = 403;
        }

        return {
            statusCode,
            body: {
                success: false,
                message: authResult.error || 'Authentication failed',
            },
        };
    }

    // 2. Role check
    const { user } = authResult;
    if (user.role !== requestedRole) {
        logger.warn('[AuthService][login] Role mismatch', {
            user_id: user.id,
            requested_role: requestedRole,
            actual_role: user.role,
        });
        return {
            statusCode: 403,
            body: {
                success: false,
                message: `Authentication successful, but you do not have ${requestedRole} privileges.`,
            },
        };
    }

    // 3. Issue JWT
    const token = signToken(
        {
            user_id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
        },
        { expiresIn: user.role === 'admin' ? '1h' : '24h' }
    );

    logger.info('[AuthService][login] Login successful', {
        email: email.substring(0, 3) + '***',
        user_id: user.id,
        role: user.role,
    });

    return {
        statusCode: 200,
        body: {
            success: true,
            message: 'Login successful',
            user_level: user.role,
            user: user.toSafeObject(),
            token,
        },
    };
}

/**
 * Signup flow.
 * @param {{ user_name: string, email: string, password: string }} params
 * @returns {Promise<{ statusCode: number, body: Object }>}
 */
async function signup({ user_name, email, password }) {
    logger.info('[AuthService][signup] Signup attempt', {
        username: user_name,
        email,
    });

    const userData = {
        username: user_name,
        email,
        password,
        role: 'participant', // Default role for new signups
    };

    const result = await userService.createUser(userData);

    if (!result.success) {
        logger.warn('[AuthService][signup] User creation failed', {
            errors: result.errors,
            email: email.substring(0, 3) + '***',
        });

        let statusCode = 400;
        if (
            result.errors &&
            result.errors.some(
                (e) => e.includes('already exists') || e.includes('Email already exists')
            )
        ) {
            statusCode = 409; // Conflict
        }

        return {
            statusCode,
            body: {
                success: false,
                message: 'User creation failed',
                errors: result.errors,
            },
        };
    }

    // Issue JWT for the newly created user
    const token = signToken(
        {
            user_id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            role: result.user.role,
        },
        { expiresIn: '24h' }
    );

    logger.info('[AuthService][signup] User created successfully', {
        user_id: result.user.id,
        username: user_name.substring(0, 3) + '***',
        email: email.substring(0, 3) + '***',
    });

    return {
        statusCode: 201,
        body: {
            success: true,
            message: 'User created successfully',
            user: result.user.toSafeObject(),
            token,
        },
    };
}

/**
 * Logout flow.
 * @param {string} token - Raw JWT (without "Bearer " prefix)
 * @returns {Promise<{ statusCode: number, body: Object }>}
 */
async function logout(token) {
    if (!token) {
        logger.warn('[AuthService][logout] Logout attempt without token');
        return {
            statusCode: 400,
            body: {
                success: false,
                message: 'No token provided',
                errors: ['Authorization header with Bearer token is required'],
            },
        };
    }

    try {
        // Verify token
        const userInfo = verifyToken(token);

        // Check if already blacklisted
        const blacklisted = await isTokenBlacklisted(token);
        if (blacklisted) {
            logger.warn('[AuthService][logout] Token already blacklisted', {
                user_id: userInfo.user_id,
            });
            return {
                statusCode: 401,
                body: {
                    success: false,
                    message: 'Token already invalidated',
                    errors: ['This token has already been revoked'],
                },
            };
        }

        // Blacklist the token
        await addToBlacklist(token, userInfo.exp);

        logger.info('[AuthService][logout] Logout successful', {
            user_id: userInfo.user_id,
            email: userInfo.email,
            role: userInfo.role,
        });

        return {
            statusCode: 200,
            body: {
                success: true,
                message: 'Logout successful',
                user: {
                    id: userInfo.user_id,
                    username: userInfo.username,
                    email: userInfo.email,
                    role: userInfo.role,
                },
                logged_out_at: new Date().toISOString(),
            },
        };
    } catch (jwtError) {
        // If token is invalid / expired the user is effectively logged out anyway
        logger.warn('[AuthService][logout] Invalid token during logout – treating as success', {
            error: jwtError.message,
        });
        return {
            statusCode: 200,
            body: {
                success: true,
                message: 'Logout successful (token was invalid/expired)',
                logged_out_at: new Date().toISOString(),
            },
        };
    }
}

// =============================================  //
// Exports
// =============================================  //

module.exports = {
    // High-level flows
    login,
    signup,
    logout,
    // JWT helpers
    signToken,
    verifyToken,
    // Blacklist
    addToBlacklist,
    isTokenBlacklisted,
    cleanupExpiredTokens,
};
