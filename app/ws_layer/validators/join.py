from pydantic import BaseModel, ValidationError
from fastapi import Depends, HTTPException
import jwt
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import WSConfig
from logger import logger

#
# This duplicate class definition was removed.
#

def verify_token(token: str, user_id: str):
    try:
        logger.info("verifying token")
        
        # For development/testing, allow test tokens ONLY in development
        if WSConfig.ENVIRONMENT == "development" and token == "test_token" and user_id:
            logger.warning("Using test_token for development. DO NOT USE IN PRODUCTION.")
            return {"status": "success", "message": "Token verified"}, 200
        
        # Try to verify with JWT if JWT_SECRET is available
        if WSConfig.JWT_SECRET:
            decoded = jwt.decode(token, WSConfig.JWT_SECRET, algorithms=["HS256"])
            if decoded.get("user_id") == user_id:
                return {"status": "success", "message": "Token verified"}, 200
        
        # If no JWT_SECRET or verification fails, reject
        logger.error("Token verification failed")
        raise HTTPException(status_code=401, detail="Invalid token")
        
    except Exception as e:
        logger.error(f"error verifying token: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

class JoinMessageValidator(BaseModel):
    space_id: str
    user_id: str
    initial_position: dict
    token: str
    
    @classmethod
    def validate(cls, message: dict):
        try:
            return cls(**message), 200
        except ValidationError as e:
            return {"status": "failed", "error": str(e)}, 400