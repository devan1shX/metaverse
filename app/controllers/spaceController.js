const SpaceService = require('../services/SpaceService');
const UserService = require('../services/UserService');
const { logger } = require('../utils/logger');

/**
 * Create a new space
 * POST /spaces
 */
async function createSpace(req, res) {
    try {
        const { name, description, isPublic, maxUsers, mapType } = req.body;
        const adminUserId = req.user.user_id;

        logger.info('Creating new space', { 
            name, 
            adminUserId, 
            isPublic, 
            maxUsers 
        });

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Space name is required"
            });
        }

        // Prepare space data
        const spaceData = {
            name: name.trim(),
            description: description?.trim() || '',
            adminUserId,
            isPublic: isPublic !== false, // Default to public
            maxUsers: maxUsers || 50, // Default max users
            mapType: mapType || 'office', // Default map type
            objects: [], // Start with empty objects array
            userIds: [] // Start with empty users array
        };

        // Create space using SpaceService
        const result = await SpaceService.createSpace(spaceData);

        if (!result.success) {
            logger.warn('Space creation failed', { 
                errors: result.errors, 
                adminUserId 
            });
            return res.status(400).json({
                success: false,
                message: "Failed to create space",
                errors: result.errors
            });
        }

        logger.info('Space created successfully', { 
            spaceId: result.space.id, 
            name: result.space.name,
            adminUserId 
        });

        // Broadcast space creation to connected users if needed
        if (global.wsManager && isPublic) {
            global.wsManager.broadcastToUser(adminUserId, {
                type: "SPACE_CREATED",
                payload: {
                    space: result.space.toSafeObject(),
                    timestamp: new Date().toISOString()
                }
            });
        }

        return res.status(201).json({
            success: true,
            message: "Space created successfully",
            space: result.space.toSafeObject()
        });

    } catch (error) {
        logger.error('Error in createSpace controller', { 
            error: error.message, 
            stack: error.stack,
            adminUserId: req.user?.user_id 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Get all spaces (with filtering)
 * GET /spaces
 */
async function getAllSpaces(req, res) {
    try {
        const { 
            isPublic, 
            limit = 20, 
            offset = 0, 
            search,
            adminUserId 
        } = req.query;

        logger.info('Getting all spaces', { 
            isPublic, 
            limit, 
            offset, 
            search,
            requesterId: req.user.user_id 
        });

        // Build filters
        const filters = {};
        if (isPublic !== undefined) {
            filters.isPublic = isPublic === 'true';
        }
        if (search) {
            filters.search = search.trim();
        }
        if (adminUserId) {
            filters.adminUserId = adminUserId;
        }

        const result = await SpaceService.getAllSpaces({
            filters,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.error
            });
        }

        // Filter out inactive spaces for non-admin users
        let spaces = result.spaces;
        if (req.user.role !== 'admin') {
            spaces = spaces.filter(space => space.isActiveSpace());
        }

        // Convert to safe objects
        const safeSpaces = spaces.map(space => space.toSafeObject());

        return res.status(200).json({
            success: true,
            spaces: safeSpaces,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: safeSpaces.length
            }
        });

    } catch (error) {
        logger.error('Error in getAllSpaces controller', { 
            error: error.message, 
            stack: error.stack 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Get space by ID
 * GET /spaces/:spaceId
 */
async function getSpaceById(req, res) {
    try {
        const { spaceId } = req.params;
        const { includeUsers = false } = req.query;
        const requesterId = req.user.user_id;

        logger.info('Getting space by ID', { spaceId, requesterId, includeUsers });

        if (!spaceId) {
            return res.status(400).json({
                success: false,
                message: "Space ID is required"
            });
        }

        const result = await SpaceService.getSpaceById(spaceId);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: "Space not found"
            });
        }

        const space = result.space;

        // Check if user has access to this space
        if (!space.isPublic && !space.hasUser(requesterId) && !space.isAdmin(requesterId) && req.user.role !== 'admin') {
            logger.warn('Unauthorized space access attempt', { spaceId, requesterId });
            return res.status(403).json({
                success: false,
                message: "Access denied to this space"
            });
        }

        let responseData = {
            success: true,
            space: space.toSafeObject()
        };

        // Include user details if requested and user has permission
        if (includeUsers === 'true' && (space.hasUser(requesterId) || space.isAdmin(requesterId) || req.user.role === 'admin')) {
            const userDetails = [];
            for (const userId of space.userIds) {
                const userResult = await UserService.getUserSafeData(userId);
                if (userResult.success) {
                    userDetails.push({
                        ...userResult.user,
                        isAdmin: space.isAdmin(userId),
                        joinedAt: space.getUserJoinTime ? space.getUserJoinTime(userId) : null
                    });
                }
            }
            responseData.users = userDetails;
        }

        return res.status(200).json(responseData);

    } catch (error) {
        logger.error('Error in getSpaceById controller', { 
            error: error.message, 
            stack: error.stack,
            spaceId: req.params.spaceId 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Update space
 * PUT /spaces/:spaceId
 */
async function updateSpace(req, res) {
    try {
        const { spaceId } = req.params;
        const updateData = req.body;
        const requesterId = req.user.user_id;

        logger.info('Updating space', { spaceId, requesterId, updateData });

        if (!spaceId) {
            return res.status(400).json({
                success: false,
                message: "Space ID is required"
            });
        }

        const result = await SpaceService.updateSpace(spaceId, updateData, requesterId);

        if (!result.success) {
            const statusCode = result.errors?.includes('Not authorized') ? 403 : 
                             result.errors?.includes('not found') ? 404 : 400;
            
            return res.status(statusCode).json({
                success: false,
                message: result.errors ? result.errors.join(', ') : "Failed to update space"
            });
        }

        logger.info('Space updated successfully', { spaceId, requesterId });

        return res.status(200).json({
            success: true,
            message: "Space updated successfully",
            space: result.space.toSafeObject()
        });

    } catch (error) {
        logger.error('Error in updateSpace controller', { 
            error: error.message, 
            stack: error.stack,
            spaceId: req.params.spaceId 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Delete space
 * DELETE /spaces/:spaceId
 */
async function deleteSpace(req, res) {
    try {
        const { spaceId } = req.params;
        const requesterId = req.user.user_id;

        logger.info('Deleting space', { spaceId, requesterId });

        if (!spaceId) {
            return res.status(400).json({
                success: false,
                message: "Space ID is required"
            });
        }

        const result = await SpaceService.deleteSpace(spaceId, requesterId);

        if (!result.success) {
            const statusCode = result.error?.includes('Not authorized') ? 403 : 
                             result.error?.includes('not found') ? 404 : 400;
            
            return res.status(statusCode).json({
                success: false,
                message: result.error
            });
        }

        logger.info('Space deleted successfully', { spaceId, requesterId });

        return res.status(200).json({
            success: true,
            message: "Space deleted successfully"
        });

    } catch (error) {
        logger.error('Error in deleteSpace controller', { 
            error: error.message, 
            stack: error.stack,
            spaceId: req.params.spaceId 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Join space
 * POST /spaces/:spaceId/join
 */
async function joinSpace(req, res) {
    try {
        const { spaceId } = req.params;
        const userId = req.user.user_id;

        logger.info('User joining space via REST API', { spaceId, userId });

        if (!spaceId) {
            return res.status(400).json({
                success: false,
                message: "Space ID is required"
            });
        }

        const result = await SpaceService.joinSpace(spaceId, userId);

        if (!result.success) {
            const statusCode = result.error?.includes('not found') ? 404 : 400;
            
            return res.status(statusCode).json({
                success: false,
                message: result.error
            });
        }

        logger.info('User joined space successfully via REST API', { spaceId, userId });

        return res.status(200).json({
            success: true,
            message: "Joined space successfully",
            space: result.space.toSafeObject()
        });

    } catch (error) {
        logger.error('Error in joinSpace controller', { 
            error: error.message, 
            stack: error.stack,
            spaceId: req.params.spaceId,
            userId: req.user?.user_id 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Leave space
 * POST /spaces/:spaceId/leave
 */
async function leaveSpace(req, res) {
    try {
        const { spaceId } = req.params;
        const userId = req.user.user_id;

        logger.info('User leaving space via REST API', { spaceId, userId });

        if (!spaceId) {
            return res.status(400).json({
                success: false,
                message: "Space ID is required"
            });
        }

        const result = await SpaceService.leaveSpace(spaceId, userId);

        if (!result.success) {
            const statusCode = result.error?.includes('not found') ? 404 : 400;
            
            return res.status(statusCode).json({
                success: false,
                message: result.error
            });
        }

        logger.info('User left space successfully via REST API', { spaceId, userId });

        return res.status(200).json({
            success: true,
            message: "Left space successfully"
        });

    } catch (error) {
        logger.error('Error in leaveSpace controller', { 
            error: error.message, 
            stack: error.stack,
            spaceId: req.params.spaceId,
            userId: req.user?.user_id 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Get user's spaces
 * GET /spaces/my-spaces
 */
async function getMySpaces(req, res) {
    try {
        const userId = req.user.user_id;
        const { includeInactive = false } = req.query;

        logger.info('Getting user spaces', { userId, includeInactive });

        const result = await SpaceService.getSpacesForUser(userId);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.error
            });
        }

        let spaces = result.spaces;

        // Filter out inactive spaces unless requested
        if (includeInactive !== 'true') {
            spaces = spaces.filter(space => space.isActiveSpace());
        }

        const safeSpaces = spaces.map(space => ({
            ...space.toSafeObject(),
            userRole: space.isAdmin(userId) ? 'admin' : 'participant'
        }));

        return res.status(200).json({
            success: true,
            spaces: safeSpaces,
            total: safeSpaces.length
        });

    } catch (error) {
        logger.error('Error in getMySpaces controller', { 
            error: error.message, 
            stack: error.stack,
            userId: req.user?.user_id 
        });
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

module.exports = {
    createSpace,
    getAllSpaces,
    getSpaceById,
    updateSpace,
    deleteSpace,
    joinSpace,
    leaveSpace,
    getMySpaces
};
