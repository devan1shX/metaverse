const { logger } = require('../utils/logger');

/**
 * Validation middleware for space creation
 */
function validateSpaceCreation(req, res, next) {
    const { name, description, isPublic, maxUsers, mapType } = req.body;
    const errors = [];

    // Validate name
    if (!name) {
        errors.push('Space name is required');
    } else if (typeof name !== 'string') {
        errors.push('Space name must be a string');
    } else if (name.trim().length < 3) {
        errors.push('Space name must be at least 3 characters long');
    } else if (name.trim().length > 100) {
        errors.push('Space name must be less than 100 characters');
    }

    // Validate description (optional)
    if (description !== undefined) {
        if (typeof description !== 'string') {
            errors.push('Description must be a string');
        } else if (description.length > 500) {
            errors.push('Description must be less than 500 characters');
        }
    }

    // Validate isPublic (optional, defaults to true)
    if (isPublic !== undefined && typeof isPublic !== 'boolean') {
        errors.push('isPublic must be a boolean');
    }

    // Validate maxUsers (optional, defaults to 50)
    if (maxUsers !== undefined) {
        if (!Number.isInteger(maxUsers) || maxUsers < 1 || maxUsers > 1000) {
            errors.push('maxUsers must be an integer between 1 and 1000');
        }
    }

    // Validate mapType (optional, defaults to 'office')
    if (mapType !== undefined) {
        const validMapTypes = ['office', 'outdoor', 'meeting', 'social', 'custom'];
        if (typeof mapType !== 'string' || !validMapTypes.includes(mapType)) {
            errors.push(`mapType must be one of: ${validMapTypes.join(', ')}`);
        }
    }

    // Validate mapImageUrl (optional)
    if (req.body.mapImageUrl !== undefined) {
        if (typeof req.body.mapImageUrl !== 'string') {
            errors.push('mapImageUrl must be a string');
        } else if (req.body.mapImageUrl.length > 500) {
           errors.push('mapImageUrl must be less than 500 characters');
        }
    }

    if (errors.length > 0) {
        logger.warn('Space creation validation failed', { 
            errors, 
            userId: req.user?.user_id,
            body: req.body 
        });
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    // Sanitize and normalize data
    req.body.name = name.trim();
    if (description) {
        req.body.description = description.trim();
    }

    next();
}

/**
 * Validation middleware for space updates
 */
function validateSpaceUpdate(req, res, next) {
    const { name, description, isPublic, maxUsers, mapType } = req.body;
    const errors = [];

    // All fields are optional for updates, but validate if provided

    // Validate name (if provided)
    if (name !== undefined) {
        if (typeof name !== 'string') {
            errors.push('Space name must be a string');
        } else if (name.trim().length < 3) {
            errors.push('Space name must be at least 3 characters long');
        } else if (name.trim().length > 100) {
            errors.push('Space name must be less than 100 characters');
        }
    }

    // Validate description (if provided)
    if (description !== undefined) {
        if (typeof description !== 'string') {
            errors.push('Description must be a string');
        } else if (description.length > 500) {
            errors.push('Description must be less than 500 characters');
        }
    }

    // Validate isPublic (if provided)
    if (isPublic !== undefined && typeof isPublic !== 'boolean') {
        errors.push('isPublic must be a boolean');
    }

    // Validate maxUsers (if provided)
    if (maxUsers !== undefined) {
        if (!Number.isInteger(maxUsers) || maxUsers < 1 || maxUsers > 1000) {
            errors.push('maxUsers must be an integer between 1 and 1000');
        }
    }

    // Validate mapType (if provided)
    if (mapType !== undefined) {
        const validMapTypes = ['office', 'outdoor', 'meeting', 'social', 'custom'];
        if (typeof mapType !== 'string' || !validMapTypes.includes(mapType)) {
            errors.push(`mapType must be one of: ${validMapTypes.join(', ')}`);
        }
    }

    if (errors.length > 0) {
        logger.warn('Space update validation failed', { 
            errors, 
            userId: req.user?.user_id,
            spaceId: req.params?.spaceId,
            body: req.body 
        });
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
    }

    // Sanitize and normalize data
    if (name) {
        req.body.name = name.trim();
    }
    if (description) {
        req.body.description = description.trim();
    }

    next();
}

/**
 * Validation middleware for space ID parameter
 */
function validateSpaceId(req, res, next) {
    const { spaceId } = req.params;

    if (!spaceId) {
        return res.status(400).json({
            success: false,
            message: 'Space ID is required'
        });
    }

    // Basic UUID format validation (if using UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Allow both UUID and simple string IDs for flexibility
    if (spaceId.length < 3 || spaceId.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Invalid space ID format'
        });
    }

    next();
}

/**
 * Validation middleware for query parameters
 */
function validateSpaceQuery(req, res, next) {
    const { limit, offset, isPublic } = req.query;
    const errors = [];

    // Validate limit
    if (limit !== undefined) {
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            errors.push('limit must be a number between 1 and 100');
        } else {
            req.query.limit = limitNum;
        }
    }

    // Validate offset
    if (offset !== undefined) {
        const offsetNum = parseInt(offset);
        if (isNaN(offsetNum) || offsetNum < 0) {
            errors.push('offset must be a non-negative number');
        } else {
            req.query.offset = offsetNum;
        }
    }

    // Validate isPublic
    if (isPublic !== undefined) {
        if (isPublic !== 'true' && isPublic !== 'false') {
            errors.push('isPublic must be "true" or "false"');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid query parameters',
            errors: errors
        });
    }

    next();
}

module.exports = {
    validateSpaceCreation,
    validateSpaceUpdate,
    validateSpaceId,
    validateSpaceQuery
};
