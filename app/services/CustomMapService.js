const fs = require('fs').promises;
const path = require('path');
const uuid4 = require('uuid4');
const { logger } = require('../utils/logger');

/**
 * Service for managing custom maps
 */
class CustomMapService {
  constructor() {
    // Save to frontend/public so Next.js can serve the files
    this.mapsDirectory = path.join(__dirname, '../../frontend/public/maps/custom');
  }

  /**
   * Ensure custom maps directory exists
   */
  async ensureDirectory() {
    try {
      await fs.access(this.mapsDirectory);
    } catch (error) {
      await fs.mkdir(this.mapsDirectory, { recursive: true });
      logger.info('Created custom maps directory', { path: this.mapsDirectory });
    }
  }

  /**
   * Save a custom map
   * @param {Object} mapData - Tiled JSON map data
   * @param {string} userId - Creator user ID
   * @returns {Promise<Object>} Result with success status and mapId
   */
  async saveCustomMap(mapData, userId) {
    try {
      await this.ensureDirectory();

      // Generate unique map ID
      const mapId = `custom-${uuid4()}`;
      
      // Add metadata to map
      const enhancedMapData = {
        ...mapData,
        customMapMetadata: {
          mapId,
          creatorId: userId,
          createdAt: new Date().toISOString(),
          version: '1.0'
        }
      };

      // Save to file
      const filePath = path.join(this.mapsDirectory, `${mapId}.json`);
      await fs.writeFile(filePath, JSON.stringify(enhancedMapData, null, 2), 'utf8');

      logger.info('Custom map saved successfully', {
        mapId,
        userId,
        filePath
      });

      return {
        success: true,
        mapId,
        filePath
      };
    } catch (error) {
      logger.error('Error saving custom map', {
        error: error.message,
        userId
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a custom map by ID
   * @param {string} mapId - Map ID
   * @returns {Promise<Object>} Result with map data
   */
  async getCustomMap(mapId) {
    try {
      const filePath = path.join(this.mapsDirectory, `${mapId}.json`);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const mapData = JSON.parse(fileContent);

      return {
        success: true,
        mapData
      };
    } catch (error) {
      logger.error('Error loading custom map', {
        error: error.message,
        mapId
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all custom maps for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Result with list of maps
   */
  async getUserCustomMaps(userId) {
    try {
      await this.ensureDirectory();
      
      const files = await fs.readdir(this.mapsDirectory);
      const userMaps = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.mapsDirectory, file);
          const content = await fs.readFile(filePath, 'utf8');
          const mapData = JSON.parse(content);

            const thumbnailPath = path.join(this.mapsDirectory, 'thumbnails', `${mapData.customMapMetadata.mapId}.png`);
            let hasThumbnail = false;
            try {
                await fs.access(thumbnailPath);
                hasThumbnail = true;
            } catch (e) {
                // No thumbnail
            }

            userMaps.push({
              mapId: mapData.customMapMetadata.mapId,
              name: mapData.customMapMetadata.mapId, // Or mapData.customMapMetadata.name if you add it
              createdAt: mapData.customMapMetadata.createdAt,
              width: mapData.width,
              height: mapData.height,
              thumbnailUrl: hasThumbnail ? `/maps/custom/thumbnails/${mapData.customMapMetadata.mapId}.png` : null
            });
          }
        
      }

      return {
        success: true,
        maps: userMaps
      };
    } catch (error) {
      logger.error('Error getting user custom maps', {
        error: error.message,
        userId
      });
      return {
        success: false,
        error: error.message,
        maps: []
      };
    }
  }
}

module.exports = CustomMapService;
