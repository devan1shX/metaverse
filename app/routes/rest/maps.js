const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure upload storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let mapName = req.body.mapName || 'default';
        // Sanitize map name to prevent directory traversal
        mapName = mapName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        
        // Define path: frontend/public/maps/[mapName]/assets/
        const uploadPath = path.join(__dirname, '../../../frontend/public/maps', mapName, 'assets');
        
        // Create directory recursively
        fs.mkdirSync(uploadPath, { recursive: true });
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Keep original filename but sanitize
        const sanitizedParams = file.originalname.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        cb(null, Date.now() + '-' + sanitizedParams);
    }
});

const upload = multer({ storage: storage });

// POST /metaverse/maps/upload
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        let mapName = req.body.mapName || 'default';
        mapName = mapName.replace(/[^a-zA-Z0-9_\-]/g, '_');

        // relative path for frontend to access (e.g. /maps/MyMap/assets/image.png)
        const publicPath = `/maps/${mapName}/assets/${req.file.filename}`;
        
        // Get image dimensions (using a library would be better, but we trust frontend will handle or we just return path for now)
        // For now, we return the path and let frontend load it to get dimensions
        
        res.json({
            success: true,
            url: publicPath,
            filename: req.file.filename,
            message: 'File uploaded successfully'
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: 'Upload failed: ' + error.message });
    }
});

// POST /metaverse/maps/save
router.post('/save', (req, res) => {
    try {
        const { mapName, mapData } = req.body;
        
        if (!mapName || !mapData) {
            return res.status(400).json({ success: false, message: 'Map Name and Data are required' });
        }

        const sanitizedMapName = mapName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const dirPath = path.join(__dirname, '../../../frontend/public/maps', sanitizedMapName);
        
        // Create directory
        fs.mkdirSync(dirPath, { recursive: true });
        
        const filePath = path.join(dirPath, `${sanitizedMapName}.json`);
        
        fs.writeFileSync(filePath, JSON.stringify(mapData, null, 2));
        
        res.json({
            success: true,
            path: `/maps/${sanitizedMapName}/${sanitizedMapName}.json`,
            message: 'Map saved successfully'
        });
    } catch (error) {
        console.error('Map save error:', error);
        res.status(500).json({ success: false, message: 'Save failed: ' + error.message });
    }
});

module.exports = router;
