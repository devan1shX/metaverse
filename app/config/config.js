const dotenv = require('dotenv');
const path = require('path');

// Load env from app/.env regardless of current working directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Config = {
  BackendPort: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST || "localhost",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "aahan123",
    port: parseInt(process.env.DB_PORT) || 5433,
    database: process.env.DATABASE || 'postgres',
  },
  USER_LEVELS:{
    ADMIN: "admin",
    PARTICIPANT: "participant",
  },
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
  WS_PORT: parseInt(process.env.WS_PORT) || 5001,
  WS_EVENTS:{
    JOIN_SPACE: "JOIN_SPACE",
    LEAVE_SPACE: "LEAVE_SPACE",
    MOVE: "MOVE",
    ACTION: "ACTION",
    CHAT: "CHAT",
    AUDIO: "AUDIO",
    LEAVE: "LEAVE",
    VIDEO: "VIDEO",
  },
  WS_BROADCAST_EVENTS:{
    USER_JOINED: "USER_JOINED",
    USER_LEFT: "USER_LEFT",
    USER_MOVED: "USER_MOVED",
    USER_ACTION: "USER_ACTION",
    CHAT_MESSAGE: "CHAT_MESSAGE",
  },
  skipCleaner: process.env.SKIP_CLEANER || false,
}

// Log configuration loading
console.log('Configuration loaded:', {
  environment: process.env.NODE_ENV || 'development',
  dbPort: Config.db.port,
  userLevels: Object.keys(Config.USER_LEVELS)
});

module.exports = {
  Config
};