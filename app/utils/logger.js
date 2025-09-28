// logger.js
class Logger {
    constructor(options = {}) {
      this.environment = options.environment || process.env.NODE_ENV || 'development';
      this.enabledLevels = this.setLogLevels();
      this.colors = {
        debug: '\x1b[36m',    // Cyan
        info: '\x1b[32m',     // Green
        warn: '\x1b[33m',     // Yellow
        error: '\x1b[31m',    // Red
        reset: '\x1b[0m'      // Reset
      };
      
      // Custom options
      this.includeTimestamp = options.includeTimestamp !== false;
      this.includeLevel = options.includeLevel !== false;
      this.includeColors = options.includeColors !== false;
      this.customPrefix = options.prefix || '';
    }
  
    setLogLevels() {
      const levels = {
        production: [],
        prod: [],
        staging: ['error'],
        development: ['debug', 'info', 'warn', 'error'],
        dev: ['debug', 'info', 'warn', 'error'],
        test: ['error']
      };
  
      return levels[this.environment.toLowerCase()] || levels.development;
    }
  
    shouldLog(level) {
      return this.enabledLevels.includes(level);
    }
  
    formatMessage(level, message, meta = {}) {
      let formattedMessage = '';
      
      // Add timestamp
      if (this.includeTimestamp) {
        const timestamp = new Date().toISOString();
        formattedMessage += `[${timestamp}] `;
      }
  
      // Add custom prefix
      if (this.customPrefix) {
        formattedMessage += `[${this.customPrefix}] `;
      }
  
      // Add log level
      if (this.includeLevel) {
        const levelUpper = level.toUpperCase();
        if (this.includeColors && typeof window === 'undefined') { // Node.js environment
          formattedMessage += `${this.colors[level]}[${levelUpper}]${this.colors.reset} `;
        } else {
          formattedMessage += `[${levelUpper}] `;
        }
      }
  
      // Add main message
      formattedMessage += message;
  
      // Add metadata if provided
      if (Object.keys(meta).length > 0) {
        formattedMessage += ` | Meta: ${JSON.stringify(meta)}`;
      }
  
      return formattedMessage;
    }
  
    debug(message, meta = {}) {
      if (this.shouldLog('debug')) {
        const formatted = this.formatMessage('debug', message, meta);
        console.log(formatted);
      }
    }
  
    info(message, meta = {}) {
      if (this.shouldLog('info')) {
        const formatted = this.formatMessage('info', message, meta);
        console.log(formatted);
      }
    }
  
    warn(message, meta = {}) {
      if (this.shouldLog('warn')) {
        const formatted = this.formatMessage('warn', message, meta);
        console.warn(formatted);
      }
    }
  
    error(message, meta = {}) {
      if (this.shouldLog('error')) {
        const formatted = this.formatMessage('error', message, meta);
        console.error(formatted);
      }
    }
  
    // Utility method to log objects/arrays in a readable format
    logObject(level, label, obj) {
      if (this.shouldLog(level)) {
        this[level](`${label}:`);
        console.log(JSON.stringify(obj, null, 2));
      }
    }
  
    // Method to temporarily override log level for debugging
    setLogLevel(levels) {
      if (Array.isArray(levels)) {
        this.enabledLevels = levels;
      } else {
        this.enabledLevels = [levels];
      }
    }
  
    // Method to get current configuration
    getConfig() {
      return {
        environment: this.environment,
        enabledLevels: this.enabledLevels,
        includeTimestamp: this.includeTimestamp,
        includeLevel: this.includeLevel,
        includeColors: this.includeColors,
        customPrefix: this.customPrefix
      };
    }
  }
  
  // Create default logger instance
  const logger = new Logger();
  
  // Export both the class and default instance
  module.exports = {
    Logger,
    logger
  };
  
  // For ES6 modules, you can also export like this:
  // export { Logger, logger };
  
  /* 
  USAGE EXAMPLES:
  
  // 1. Basic usage with default logger
  const { logger } = require('../utils/logger');
  
  logger.debug('This is a debug message');
  logger.info('Application started');
  logger.warn('This is a warning');
  logger.error('An error occurred');
  
  // 2. With metadata
  logger.info('User login', { userId: 123, email: 'user@example.com' });
  logger.error('Database connection failed', { 
    error: 'Connection timeout', 
    host: 'localhost',
    port: 5432 
  });
  
  // 3. Create custom logger instance
  const { Logger } = require('./logger');
  const apiLogger = new Logger({
    environment: 'development',
    prefix: 'API',
    includeColors: true
  });
  
  apiLogger.info('API endpoint called', { route: '/users', method: 'GET' });
  
  // 4. Log objects/arrays
  logger.logObject('debug', 'User Data', { 
    name: 'John Doe', 
    roles: ['admin', 'user'],
    settings: { theme: 'dark', notifications: true }
  });
  
  // 5. Environment-based configuration
  // Set NODE_ENV environment variable:
  // NODE_ENV=production node app.js  (no logs except errors in staging)
  // NODE_ENV=development node app.js (all logs)
  
  // 6. Temporarily change log levels
  logger.setLogLevel(['error', 'warn']); // Only show errors and warnings
  logger.debug('This won\'t show');
  logger.error('This will show');
  
  // 7. Check current configuration
  console.log(logger.getConfig());
  
  // 8. In browser environment (no colors will be applied automatically)
  // <script src="logger.js"></script>
  // const browserLogger = new Logger({ environment: 'development' });
  
  ENVIRONMENT CONFIGURATIONS:
  - production/prod: No logs (completely silent)
  - staging: Only error logs
  - development/dev: All logs (debug, info, warn, error)
  - test: Only error logs
  
  FEATURES:
  ✅ Environment-based log filtering
  ✅ Colored output (Node.js only)
  ✅ Timestamp inclusion
  ✅ Metadata support
  ✅ Custom prefixes
  ✅ Object/array pretty printing
  ✅ Configurable options
  ✅ Multiple logger instances
  ✅ Runtime log level changes
  */