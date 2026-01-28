const express = require('express');
const { verifyFirebaseToken } = require('../../middleware/firebaseAuth');
const UserService = require('../../services/UserService');
const CustomMapService = require('../../services/CustomMapService');
const { logger } = require('../../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const userService = new UserService();
const customMapService = new CustomMapService();

// Configure multer for thumbnails
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../../frontend/public/maps/custom/thumbnails');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Use mapId as filename if provided, generic timestamp otherwise (will retain extension)
    const mapId = req.body.mapId || `thumb-${Date.now()}`;
    // Always save as png for consistency, or keep original extension
    cb(null, `${mapId}.png`);
  }
});

const upload = multer({ storage: storage });

/**
 * Helper middleware to get PostgreSQL user from Firebase email
 */
async function attachDbUser(req, res, next) {
  try {
    const result = await userService.getUserByEmail(req.firebaseUser.email);
    if (!result.success || !result.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database',
      });
    }
    req.dbUser = result.user;
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

/**
 * @route   POST /api/custom-maps/thumbnail
 * @desc    Upload a thumbnail for a custom map
 * @access  Private
 */
router.post('/thumbnail', verifyFirebaseToken, attachDbUser, upload.single('thumbnail'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No thumbnail uploaded' });
        }

        const mapId = req.body.mapId;
        if (!mapId) {
             return res.status(400).json({ success: false, message: 'Map ID is required' });
        }
        
        // Construct public URL
        const publicUrl = `/maps/custom/thumbnails/${req.file.filename}`;

        logger.info('Thumbnail uploaded', { mapId, filename: req.file.filename });

        return res.json({
            success: true,
            thumbnailUrl: publicUrl
        });

    } catch (error) {
        logger.error('Thumbnail upload error', { error: error.message });
        return res.status(500).json({ success: false, message: 'Thumbnail upload failed' });
    }
});

/**
 * @route   POST /api/custom-maps
 * @desc    Save a custom map
 * @access  Private (authenticated users)
 */
router.post('/', verifyFirebaseToken, attachDbUser, async (req, res) => {
  try {
    const { mapData } = req.body;
    const userId = req.user.user_id;

    if (!mapData) {
      return res.status(400).json({
        success: false,
        message: 'Map data is required'
      });
    }

    logger.info('Saving custom map', { userId });

    const result = await customMapService.saveCustomMap(mapData, userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to save custom map',
        error: result.error
      });
    }

    logger.info('Custom map saved successfully', {
      mapId: result.mapId,
      userId
    });

    return res.status(201).json({
      success: true,
      message: 'Custom map saved successfully',
      mapId: result.mapId
    });
  } catch (error) {
    logger.error('Error in saveCustomMap endpoint', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/custom-maps/my-maps
 * @desc    Get current user's custom maps
 * @access  Private (authenticated users)
 */
router.get('/my-maps', verifyFirebaseToken, attachDbUser, async (req, res) => {
  try {
    const userId = req.user.user_id;

    logger.info('Getting user custom maps', { userId });

    const result = await customMapService.getUserCustomMaps(userId);

    return res.status(200).json({
      success: true,
      maps: result.maps || []
    });
  } catch (error) {
    logger.error('Error in getUserCustomMaps endpoint', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      maps: []
    });
  }
});

/**
 * @route   GET /api/custom-maps/:mapId
 * @desc    Get custom map by ID
 * @access  Private (authenticated users)
 */
router.get('/:mapId', verifyFirebaseToken, attachDbUser, async (req, res) => {
  try {
    const { mapId } = req.params;

    if (!mapId || !mapId.startsWith('custom-')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid map ID format'
      });
    }

    logger.info('Getting custom map', { mapId });

    const result = await customMapService.getCustomMap(mapId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Custom map not found'
      });
    }

    return res.status(200).json({
      success: true,
      mapData: result.mapData
    });
  } catch (error) {
    logger.error('Error in getCustomMap endpoint', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
