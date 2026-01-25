const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../../../middleware/firebaseAuth');
const { firebaseSyncController } = require('../../../controllers/firebaseSync');

// POST /metaverse/auth/firebase-sync
// Sync Firebase authenticated user with PostgreSQL database
router.post('/', verifyFirebaseToken, firebaseSyncController);

module.exports = router;
