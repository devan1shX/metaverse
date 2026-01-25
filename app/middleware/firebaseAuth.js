const { auth } = require('../config/firebase-admin');
const { logger } = require('../utils/logger');

const UserService = require('../services/UserService');
const userService = new UserService();

/**
 * Middleware to verify Firebase ID token
 * Extracts the Firebase UID and user info from the token
 * and attaches it to req.firebaseUser
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
 * Helper middleware to get PostgreSQL user from Firebase email
 * Populates req.user which controllers expect
 */
async function attachDbUser(req, res, next) {
  try {
    if (!req.firebaseUser || !req.firebaseUser.email) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No user email in token',
      });
    }

    const result = await userService.getUserByEmail(req.firebaseUser.email);
    if (!result.success || !result.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database',
      });
    }
    
    // Attach dbUser for reference
    req.dbUser = result.user;
    
    // Attach user object formatted as controllers expect (from auth.js middleware)
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

module.exports = { verifyFirebaseToken, attachDbUser };
