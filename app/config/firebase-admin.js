const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

// Initialize Firebase Admin SDK
// For dev environment, we use application default credentials
// No service account file is needed for token verification only
try {
  admin.initializeApp({
    projectId: 'remote-office-metaverse',
  });
  logger.info('[Firebase Admin] Firebase Admin SDK initialized successfully');
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    // App already initialized, ignore
    logger.info('[Firebase Admin] Firebase Admin app already initialized');
  } else {
    logger.error('[Firebase Admin] Error initializing Firebase Admin:', error);
    throw error;
  }
}

// Export admin auth instance
const auth = admin.auth();

module.exports = {
  admin,
  auth,
};
