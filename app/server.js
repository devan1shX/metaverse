// server file for the backend
// loads up the app and starts the server
const { app, wsManager } = require('./app');
const { logger } = require('./utils/logger');
const { Config } = require('./config/config');
const port = process.env.PORT || 3000;

// Start Express server
app.listen(port, () => {
  logger.info(`Express server is running on port ${port}`, { 
    port, 
    environment: process.env.NODE_ENV || 'development' 
  });
});

// Log WebSocket server status
logger.info(`WebSocket server is running on port ${Config.WS_PORT}`, {
  wsPort: Config.WS_PORT,
  connectedUsers: wsManager.getConnectedUsers().length
});