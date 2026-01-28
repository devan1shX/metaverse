const { UserRepository } = require("../repositories");
const SpaceService = require("../services/SpaceService");
const UserService = require("../services/UserService");
const { logger } = require("../utils/logger");
const userRepository = new UserRepository();
const spaceService = new SpaceService();
const userService = new UserService();
/**
 * Create a new space
 * POST /spaces
 */
async function createSpace(req, res) {
  try {
    const { 
      name, 
      description, 
      isPublic, 
      maxUsers,
      mapId,
      mapImageUrl 
    } = req.body;
    const adminUserId = req.user.user_id;
    
    console.log("🔍 CREATE SPACE REQUEST:", {
      name,
      description,
      isPublic,
      maxUsers,
      mapId,
      mapImageUrl,
      adminUserId
    });
    
    logger.info("Creating new space", {
      name,
      adminUserId,
      isPublic,
      maxUsers,
      mapId,
    }); // Validate required fields

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Space name is required",
      });
    }

    // Accept any mapId - supports office-01, office-02, and custom-* maps
    const finalMapId = mapId || 'office-01'; // Default to office-01 only if no mapId provided

    // Prepare space data
    const spaceData = {
      name: name.trim(),
      description: description?.trim() || "",
      adminUserId,
      isPublic: isPublic !== false, // Default to public
      maxUsers: maxUsers || 50, // Default max users
      mapId: finalMapId, // Use mapId instead of mapType
      mapImageUrl: mapImageUrl, // Pass the map image URL
      objects: [], // Start with empty objects array
      userIds: [], // Start with empty users array
    }; // Create space using SpaceService

    console.log("📦 SPACE DATA TO SERVICE:", spaceData);

    const result = await spaceService.createSpace(spaceData);
    if (!result.success) {
      logger.warn("Space creation failed", {
        errors: result.errors,
        adminUserId,
      });
      return res.status(400).json({
        success: false,
        message: "Failed to create space",
        errors: result.errors,
      });
    }

    logger.info("Space created successfully", {
      spaceId: result.space.id,
      name: result.space.name,
      adminUserId,
    });

    return res.status(201).json({
      success: true,
      message: "Space created successfully",
      space: result.space.toSafeObject(),
    });
  } catch (error) {
    logger.error("Error in createSpace controller", {
      error: error.message,
      stack: error.stack,
      adminUserId: req.user?.user_id,
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Get all spaces (with filtering)
 * GET /spaces
 */
async function getAllSpaces(req, res) {
  try {
    const { isPublic, limit = 20, offset = 0, search, adminUserId } = req.query;

    logger.info("Getting all spaces", {
      isPublic,
      limit,
      offset,
      search,
      requesterId: req.user.user_id,
    }); // Build filters

    const filters = {};
    if (isPublic !== undefined) {
      filters.isPublic = isPublic === "true";
    }
    if (search) {
      filters.search = search.trim();
    }
    if (adminUserId) {
      filters.adminUserId = adminUserId;
    }

    const result = await spaceService.getAllSpaces({
      filters,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error,
      });
    } // Filter out inactive spaces for non-admin users

    let spaces = result.spaces;
    if (req.user.role !== "admin") {
      spaces = spaces.filter((space) => space.isActiveSpace());
    } // Convert to safe objects

    const safeSpaces = spaces.map((space) => space.toSafeObject());

    return res.status(200).json({
      success: true,
      spaces: safeSpaces,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: safeSpaces.length,
      },
    });
  } catch (error) {
    logger.error("Error in getAllSpaces controller", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
    const requesterId = req.user.user_id;

    logger.info("Getting space by ID", { spaceId, requesterId });

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: "Space ID is required",
      });
    }

    const SpaceRepository = require("../repositories/SpaceRepository");
    const spaceRepo = new SpaceRepository();
    const spaceData = await spaceRepo.getCompleteSpaceInfo(spaceId);
    if (!spaceData) {
      return res.status(404).json({
        success: false,
        message: "Space not found",
      });
    }

    const userIds =
      spaceData.users[0]?.id === null
        ? []
        : spaceData.users.map((user) => user.id);
    const Space = require("../models/Space");
    const space = Space.fromDatabaseRow(spaceData, userIds);

    const isPublic = space.isPublic;
    const isAdmin = space.isAdmin(requesterId);
    const isMember = space.hasUser(requesterId);
    if (!isPublic && !isMember && !isAdmin && req.user.role !== "admin") {
      logger.warn("Unauthorized space access attempt", {
        spaceId,
        requesterId,
      });
      return res.status(403).json({
        success: false,
        message: "Access denied to this space",
      });
    }

    const safeSpace = space.toSafeObject();
    safeSpace.users = spaceData.users;
    safeSpace.isAdmin = isAdmin;

    return res.status(200).json({
      success: true,
      space: safeSpace,
    });
  } catch (error) {
    logger.error("Error in getSpaceById controller", {
      error: error.message,
      stack: error.stack,
      spaceId: req.params.spaceId,
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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

    logger.info("Updating space", { spaceId, requesterId, updateData });

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: "Space ID is required",
      });
    }

    const result = await spaceService.updateSpace(
      spaceId,
      updateData,
      requesterId
    );

    if (!result.success) {
      const statusCode = result.errors?.includes("Not authorized")
        ? 403
        : result.errors?.includes("not found")
        ? 404
        : 400;
      return res.status(statusCode).json({
        success: false,
        message: result.errors
          ? result.errors.join(", ")
          : "Failed to update space",
      });
    }

    logger.info("Space updated successfully", { spaceId, requesterId });

    return res.status(200).json({
      success: true,
      message: "Space updated successfully",
      space: result.space.toSafeObject(),
    });
  } catch (error) {
    logger.error("Error in updateSpace controller", {
      error: error.message,
      stack: error.stack,
      spaceId: req.params.spaceId,
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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

    logger.info("Deleting space", { spaceId, requesterId });

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: "Space ID is required",
      });
    }

    const result = await spaceService.deleteSpace(spaceId, requesterId);

    if (!result.success) {
      const statusCode = result.error?.includes("Not authorized")
        ? 403
        : result.error?.includes("not found")
        ? 404
        : 400;
      return res.status(statusCode).json({
        success: false,
        message: result.error,
      });
    }

    logger.info("Space deleted successfully", { spaceId, requesterId });

    return res.status(200).json({
      success: true,
      message: "Space deleted successfully",
    });
  } catch (error) {
    logger.error("Error in deleteSpace controller", {
      error: error.message,
      stack: error.stack,
      spaceId: req.params.spaceId,
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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

    logger.info("User joining space via REST API", { spaceId, userId });

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: "Space ID is required",
      });
    }

    const result = await spaceService.joinSpace(spaceId, userId);

    if (!result.success) {
      const statusCode = result.error?.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        message: result.error,
      });
    }

    logger.info("User joined space successfully via REST API", {
      spaceId,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Joined space successfully",
      space: result.space.toSafeObject(),
    });
  } catch (error) {
    logger.error("Error in joinSpace controller", {
      error: error.message,
      stack: error.stack,
      spaceId: req.params.spaceId,
      userId: req.user?.user_id,
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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

    logger.info("User leaving space via REST API", { spaceId, userId });

    if (!spaceId) {
      return res.status(400).json({
        success: false,
        message: "Space ID is required",
      });
    }

    const result = await spaceService.leaveSpace(spaceId, userId);

    if (!result.success) {
      const statusCode = result.error?.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        message: result.error,
      });
    }

    logger.info("User left space successfully via REST API", {
      spaceId,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Left space successfully",
    });
  } catch (error) {
    logger.error("Error in leaveSpace controller", {
      error: error.message,
      stack: error.stack,
      spaceId: req.params.spaceId,
      userId: req.user?.user_id,
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
    const { includeInactive = "false" } = req.query;

    logger.info("Getting user spaces", { userId, includeInactive });

    const SpaceRepository = require("../repositories/SpaceRepository");
    const spaceRepo = new SpaceRepository();
    const rawSpaces = await spaceRepo.getUserSpacesComplete(userId);

    const Space = require("../models/Space");
    const spaces = [];

    for (const row of rawSpaces) {
      if (includeInactive !== "true" && !row.is_active) {
        continue;
      }
      const userIds = await spaceRepo.getUserIdsInSpace(row.id);
      const space = Space.fromDatabaseRow(row, userIds);

      const safeSpace = space.toSafeObject();
      safeSpace.isAdmin = row.admin_user_id === userId; // Use direct check from row
      spaces.push(safeSpace);
    }

    return res.status(200).json({
      success: true,
      spaces: spaces,
      total: spaces.lengths,
    });
  } catch (error) {
    logger.error("Error in getMySpaces controller", {
      error: error.message,
      stack: error.stack,
      userId: req.user?.user_id,
    });
    return res.status(500).json({
      success: false,
      message: "Internal server error", // <-- This was line 445
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
  getMySpaces,
};
