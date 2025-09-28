const { Config } = require("../config/config");
const { WS_EVENTS } = Config;

const Validator = require("../validity/validityChecker.js");
const UserService = require("../services/UserService.js");
const SpaceService = require("../services/SpaceService.js");
const { logger } = require("./logger.js");
class WebsocketMessageParser {
  constructor() {}
  
  async HandleJoinSpace(message){
    try {
      const validity = Validator.ValidityJoinMessage(message);
      logger.info('Handling join space request from user', { userId: message.payload.userId });
      if (validity.status === "failed") {
        logger.warn('Join space validation failed', { error: validity.error });
        return validity;
      }
      const spaceId = message.payload.spaceId;
      const userId = message.payload.userId;
      const initialPosition = message.payload.initialPosition;
      logger.debug('Join space request details', { spaceId, userId, initialPosition });
      const userResult = await UserService.getUserById(userId);
      if (!userResult.success) {
        logger.warn('User not found for join space', { userId, error: userResult.error });
        return {
          status: "failed",
          error: userResult.error || "User not found"
        };
      }
      const spaceResult = await SpaceService.joinSpace(spaceId, userId);
      
      if (!spaceResult.success) {
        logger.warn('Failed to join space', { spaceId, userId, error: spaceResult.error });
        return {
          status: "failed",
          error: spaceResult.error || "Failed to join space"
        };
      }

      logger.info('User successfully joined space', { spaceId, userId });
      
      return {
        status: "success",
        message: "Join space successful",
        data: {
          space: spaceResult.space ? spaceResult.space.toSafeObject() : null,
          user: userResult.user ? userResult.user.toSafeObject() : null,
          position: initialPosition
        }
      };
    } catch (error) {
      logger.error('Error in HandleJoinSpace', { 
        error: error.message, 
        stack: error.stack,
        message: message
      });
      return {
        status: "failed",
        error: "Internal server error"
      };
    }
  }
  SafeGetEventType(message) {
    const jsonMessage = message;
    
    // Check if message has type property
    if (!jsonMessage || !jsonMessage.type) {
      return {
        status: "failed",
        error: "Type is required",
      };
    }
    
    const type = jsonMessage.type;
    
    // Check if WS_EVENTS is properly loaded
    if (!WS_EVENTS) {
      logger.error('WS_EVENTS is not properly loaded from config');
      return {
        status: "failed",
        error: "Server configuration error",
      };
    }
    
    // Check if type is valid
    if (!(type in WS_EVENTS)) {
      logger.warn('Invalid WebSocket event type received', { type, validTypes: Object.keys(WS_EVENTS) });
      return {
        status: "failed",
        error: "Invalid event type",
      };
    }
    
    return type;
  }
  SafeConvertToJson(message) {
    try {
      return JSON.parse(message);
    } catch (error) {
      logger.error("Error converting message to json:", error);
      return {
        status: "failed",
        error: "Error converting message to json",
      };
    }
  }

  async HandleClientMessage(message){
    const jsonMessage = this.SafeConvertToJson(message);
    if(jsonMessage.status==="failed"){
        return {
            status:jsonMessage.status,
            error:jsonMessage.error,
        }
    }
    message = jsonMessage;
    const Ret = this.SafeGetEventType(message);
    if (Ret.status === "failed") {
        return Ret;
    }
    const type = Ret;
    
    try {
      if (type === "JOIN_SPACE") {
        return await this.HandleJoinSpace(message);
      }
      if (type === "LEAVE_SPACE") {
        // TODO: Handle Leave Space
        return await this.HandleLeaveSpace(message);
      }
      if (type === "MOVE") {
        // TODO: Handle Move
        return await this.HandleMove(message);
      }
      if (type === "ACTION") {
        // TODO: Handle Action
        return await this.HandleAction(message);
      }
      if (type === "CHAT") {
        // TODO: Handle Chat
        return await this.HandleChat(message);
      }
      if (type === "AUDIO") {
        // TODO: Handle Audio
        return await this.HandleAudio(message);
      }
      if (type === "VIDEO") {
        // TODO: Handle Video
        return await this.HandleVideo(message);
      }
      
      // If we reach here, the event type is valid but not implemented
      logger.warn('WebSocket event type not implemented', { type });
      return {
        status: "failed",
        error: "Event type not implemented"
      };
    } catch (error) {
      logger.error('Error handling WebSocket message', { 
        error: error.message, 
        stack: error.stack, 
        type, 
        message 
      });
      return {
        status: "failed",
        error: "Internal server error"
      };
    }
  }
}

WSMessageParser = new WebsocketMessageParser();

module.exports = WSMessageParser;
