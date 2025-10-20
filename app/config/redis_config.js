const redis = require('redis');
const { logger } = require('../utils/logger');

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;

// Modern Redis client configuration
const redisOptions = {
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
};

if (REDIS_PASSWORD) {
  redisOptions.password = REDIS_PASSWORD;
}

const client = redis.createClient(redisOptions);

// Event listeners with proper logging
client.on('connect', () => {
  logger.info('Redis client connected', { 
    host: REDIS_HOST, 
    port: REDIS_PORT 
  });
});

client.on('ready', () => {
  logger.info('Redis client ready', { 
    host: REDIS_HOST, 
    port: REDIS_PORT 
  });
});

client.on('error', (err) => {
  logger.error('Redis connection error', { 
    error: err.message,
    host: REDIS_HOST,
    port: REDIS_PORT
  });
});

client.on('end', () => {
  logger.info('Redis connection closed', { 
    host: REDIS_HOST, 
    port: REDIS_PORT 
  });
});

client.on('reconnecting', () => {
  logger.info('Redis client reconnecting', { 
    host: REDIS_HOST, 
    port: REDIS_PORT 
  });
});

// Connect to Redis
client.connect().catch((err) => {
  logger.error('Failed to connect to Redis', { 
    error: err.message,
    host: REDIS_HOST,
    port: REDIS_PORT
  });
});

module.exports = client;
