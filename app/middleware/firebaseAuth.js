const { auth } = require('../config/firebase-admin');
const { logger } = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { Config } = require('../config/config');
const { isTokenBlacklisted } = require('../services/AuthService');

const UserService = require('../services/UserService');
const userService = new UserService();

/**
 * Middleware to verify Firebase ID token ONLY.
 * Used for routes that must be Firebase-authenticated (e.g. /auth/firebase-sync).
 */
async function verifyFirebaseToken(req, res, next) {
  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[Firebase Auth] No authorization header found');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No token provided',
      });
    }

    // Extract the token
    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      logger.warn('[Firebase Auth] No token in authorization header');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token format',
      });
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);

    // Attach Firebase user info to request object
    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      provider: decodedToken.firebase.sign_in_provider,
    };

    logger.info('[Firebase Auth] Token verified successfully', {
      uid: decodedToken.uid,
      email: decodedToken.email?.substring(0, 3) + '***',
      provider: decodedToken.firebase.sign_in_provider,
    });

    next();
  } catch (error) {

    logger.error('[Firebase Auth] Token verification failed', {
      error: error.message,
      code: error.code,
    });

    // Handle specific Firebase errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Token expired - Please sign in again',
      });
    } else if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        message: 'Token revoked - Please sign in again',
      });
    } else if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Invalid token',
    });
  }
}

/**
 * Detect if Bearer token is likely our app JWT (no "kid" in header).
 * Firebase ID tokens always include "kid"; our JWTs do not.
 */
function isAppJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    const header = JSON.parse(Buffer.from(base64, 'base64').toString());
    return !header.kid;
  } catch {
    return false;
  }
}

/**
 * Middleware to verify EITHER a Firebase ID token OR a JWT issued by this app.
 * - If token has no "kid" in header (our JWT), verifies as JWT only (no Firebase call).
 * - Otherwise tries Firebase first, then falls back to JWT.
 * Populates req.firebaseUser (for Firebase) and/or req.user for downstream controllers.
 */
async function verifyAuthToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[Auth] No authorization header found');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No token provided',
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      logger.warn('[Auth] No token in authorization header');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid token format',
      });
    }

    // If token is clearly our JWT (no "kid"), skip Firebase and verify as JWT only
    const useJwtOnly = isAppJwt(token);

    if (!useJwtOnly) {
      // 1) Try Firebase verification first for tokens that look like Firebase ID tokens
      try {
        const decodedToken = await auth.verifyIdToken(token);

        req.firebaseUser = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
          name: decodedToken.name || null,
          picture: decodedToken.picture || null,
          provider: decodedToken.firebase.sign_in_provider,
        };

        logger.info('[Auth] Firebase token verified successfully', {
          uid: decodedToken.uid,
          email: decodedToken.email?.substring(0, 3) + '***',
          provider: decodedToken.firebase.sign_in_provider,
        });

        return next();
      } catch (firebaseError) {
        if (firebaseError.code === 'auth/id-token-expired') {
          return res.status(401).json({
            success: false,
            message: 'Token expired - Please sign in again',
          });
        }
        if (firebaseError.code === 'auth/id-token-revoked') {
          return res.status(401).json({
            success: false,
            message: 'Token revoked - Please sign in again',
          });
        }
        // Not a valid Firebase token; fall through to JWT verification
        if (firebaseError.code !== 'auth/argument-error' && firebaseError.code !== 'auth/invalid-id-token') {
          logger.error('[Auth] Firebase token verification failed', {
            error: firebaseError.message,
            code: firebaseError.code,
          });
          return res.status(401).json({
            success: false,
            message: 'Unauthorized - Invalid token',
          });
        }
      }
    }

    // 2) Verify as JWT issued by this application
    if (await isTokenBlacklisted(token)) {
      logger.warn('[Auth] Access denied: Token is blacklisted');
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated. Please login again.',
      });
    }

    try {
      const decoded = jwt.verify(token, Config.JWT_SECRET);

      req.user = {
        user_id: decoded.user_id,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role,
      };
      req.token = token;

      logger.info('[Auth] JWT token verified successfully', {
        user_id: decoded.user_id,
        email: decoded.email,
        role: decoded.role,
      });

      return next();
    } catch (jwtError) {
      logger.warn('[Auth] Invalid JWT provided', {
        error: jwtError.message,
      });

      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Token verification failed.',
        });
      }
    }
  } catch (error) {
    logger.error('[Auth] Unexpected error during token verification', {
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
  }
}

/**
 * Helper middleware to get PostgreSQL user from either Firebase email or JWT user email
 * Populates req.user which controllers expect
 */
async function attachDbUser(req, res, next) {
  try {
    // Prefer Firebase email when available, otherwise fall back to JWT user email
    const email =
      (req.firebaseUser && req.firebaseUser.email) ||
      (req.user && req.user.email) ||
      null;

    if (!email) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No user email in token',
      });
    }

    const result = await userService.getUserByEmail(email);
    if (!result.success || !result.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database',
      });
    }
    
    // Attach dbUser for reference
    req.dbUser = result.user;
    
    // Attach user object formatted as controllers expect
    req.user = {
      user_id: result.user.id,
      email: result.user.email,
      username: result.user.username,
      role: result.user.role,
    };
    next();
  } catch (error) {
    logger.error('[attachDbUser] Error fetching database user', {
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user data',
    });
  }
}

module.exports = { verifyFirebaseToken, verifyAuthToken, attachDbUser };
