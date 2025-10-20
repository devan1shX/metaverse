// initialise the db with the required tables 
const { get_async_db } = require('./db_conn');
const { logger } = require('../utils/logger');
const UserService = require('../services/UserService');
const userService = new UserService();
const {Config} = require('./config');
const { db_cleaner } = require('../utils/database/db_cleaner');

async function init_db(skipCleaner = false) {
  if (!skipCleaner) {
    await db_cleaner(); 
  }
  try {
    logger.info('[init_db][init_db] Initializing database...');
    const db = await get_async_db();

    await db.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
        role VARCHAR(50) NOT NULL DEFAULT 'participant',
        user_name VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        user_designation TEXT DEFAULT 'None',
        user_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_avatar_url VARCHAR(255) DEFAULT '/avatars/avatar-2.png',
        user_about TEXT,
        user_is_active BOOLEAN NOT NULL DEFAULT TRUE,
        user_spaces JSONB DEFAULT '[]'::jsonb,
        user_notifications JSONB DEFAULT '[]'::jsonb
      );

      -- Spaces table
      CREATE TABLE IF NOT EXISTS spaces (
        id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        map_image_url VARCHAR(255),
        admin_user_id UUID NOT NULL,
        is_public BOOLEAN NOT NULL DEFAULT TRUE,
        max_users INTEGER NOT NULL DEFAULT 50,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        objects JSONB DEFAULT '[]'::jsonb,
        FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT spaces_name_unique UNIQUE (name),
        CONSTRAINT spaces_max_users_check CHECK (max_users > 0 AND max_users <= 1000)
      );

      -- User-Space relationship table (many-to-many)
      CREATE TABLE IF NOT EXISTS user_spaces (
        user_id UUID NOT NULL,
        space_id UUID NOT NULL,
        joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, space_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
      );

      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        status VARCHAR(20) NOT NULL DEFAULT 'unread',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT notifications_type_check CHECK (type IN ('updates', 'invites')),
        CONSTRAINT notifications_status_check CHECK (status IN ('unread', 'read', 'dismissed'))
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_spaces_admin_user_id ON spaces(admin_user_id);
      CREATE INDEX IF NOT EXISTS idx_spaces_is_public ON spaces(is_public);
      CREATE INDEX IF NOT EXISTS idx_spaces_is_active ON spaces(is_active);
      CREATE INDEX IF NOT EXISTS idx_spaces_created_at ON spaces(created_at);
      
      CREATE INDEX IF NOT EXISTS idx_user_spaces_user_id ON user_spaces(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_spaces_space_id ON user_spaces(space_id);
      CREATE INDEX IF NOT EXISTS idx_user_spaces_joined_at ON user_spaces(joined_at);
      
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_active ON notifications(is_active);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

      -- Blacklisted tokens table (for logout functionality)
      CREATE TABLE IF NOT EXISTS blacklisted_tokens (
        id UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_blacklisted_tokens_token ON blacklisted_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_blacklisted_tokens_expires_at ON blacklisted_tokens(expires_at);
    `);

    logger.info("[init_db][init_db] Database tables created successfully (users, spaces, user_spaces, notifications, blacklisted_tokens)");
    await add_admin();
  } catch (error) {
    logger.error('[init_db][init_db] Database initialization failed', { error: error.message, stack: error.stack });
    throw error;
  }
}
 async function add_admin(){
  try {
    // Check if admin already exists
    const existingAdmin = await userService.getUserByEmail(Config.ADMIN_EMAIL);
    if (existingAdmin.success) {
      logger.info("[init_db][add_admin] Admin user already exists, skipping creation");
      return;
    }

    const user_data = {
      "email": Config.ADMIN_EMAIL,
      "password": Config.ADMIN_PASSWORD,
      "role": Config.USER_LEVELS.ADMIN,
      "username": Config.ADMIN_EMAIL.split("@")[0],
      "user_created_at": Date.now(),
      "user_updated_at": Date.now(),
      "user_is_active": true
    }
    const admin = await userService.createUser(user_data);
    if(admin.success){
      logger.info("[init_db][add_admin] Admin user created successfully");
    }
    else {
      logger.error("[init_db][add_admin] Admin user creation failed", { error: admin.errors });
    }
  } catch (error) {
    logger.error("[init_db][add_admin] Error in add_admin function", { error: error.message, stack: error.stack });
  }
}
module.exports = { init_db, add_admin };
