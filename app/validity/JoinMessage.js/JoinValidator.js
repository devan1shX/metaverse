function JoinValidator(message){
    // Message should already be parsed JSON object when it reaches here
    const jsonMessage = message;
    
    // Basic message structure validation
    if (!jsonMessage || typeof jsonMessage !== 'object') {
      return {
        status: "failed",
        error: "Invalid message format",
      };
    }
    
    if (!jsonMessage.type || jsonMessage.type !== "JOIN_SPACE") {
      return {
        status: "failed",
        error: "Invalid message type for join space",
      };
    }
    if (!jsonMessage.payload) {
      return {
        status: "failed",
        error: "Payload is required",
      };
    }
    const payload = jsonMessage.payload;

    if (!payload.spaceId || typeof payload.spaceId !== "string") {
      return {
        status: "failed",
        error: "spaceId is required and must be a string",
      };
    }

    if (!payload.userId || typeof payload.userId !== "string") {
      return {
        status: "failed",
        error: "userId is required and must be a string",
      };
    }

    if (!payload.initialPosition || typeof payload.initialPosition !== "object") {
      return {
        status: "failed",
        error: "initialPosition is required and must be an object",
      };
    }

    if (typeof payload.initialPosition.x !== "number") {
      return {
        status: "failed",
        error: "initialPosition.x is required and must be a number",
      };
    }

    if (typeof payload.initialPosition.y !== "number") {
      return {
        status: "failed",
        error: "initialPosition.y is required and must be a number",
      };
    }

    if (!payload.initialPosition.direction || typeof payload.initialPosition.direction !== "string") {
      return {
        status: "failed",
        error: "initialPosition.direction is required and must be a string",
      };
    }

    return {
      status: "success",
      message: "Join space message is valid",
    };
  }
module.exports = JoinValidator;