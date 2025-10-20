const express = require('express');
const cors = require('cors');
const { logger } = require('./utils/logger');
const {login_routes} = require('./routes/rest/post/login');
const {signup_routes} = require('./routes/rest/post/signup');
const {log_out_router} = require('./controllers/logout');
const protectedRoutes = require('./routes/rest/protected');
const { user_routes } = require('./routes/rest/users'); 
const { dashboard_routes } = require('./routes/rest/dashboard');
const spaceRoutes = require('./routes/rest/spaces');
const notificationRoutes = require('./routes/rest/notifications');
const inviteRoutes = require('./routes/rest/invites');
const internalRoutes = require('./routes/rest/internal');
const app = express();
const {Config} = require('./config/config');
logger.info('Initializing Express application...');
const redisClient = require('./config/redis_config');
// Initialize WebSocket Manager (starts WebSocket server automatically)
const wsManager = require('./routes/ws/ws_handler');
logger.info('WebSocket server initialized', { 
    port: require('./config/config').Config.WS_PORT,
    connectedUsers: wsManager.getConnectedUsers().length 
});
logger.info('Redis client initialized', { 
    host: redisClient.host,
    port: redisClient.port,
    password: redisClient.password
});
redisClient.on('connect', () => {
    logger.info('Redis client connected');
});
redisClient.on('error', (err) => {
    logger.error('Redis client error', { error: err.message });
});
redisClient.on('end', () => {
    logger.info('Redis client disconnected');
});

global.wsManager = wsManager;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
const {init_db} = require('./config/init_db');
init_db(Config.skipCleaner).then(() => {
    logger.info('Database initialization completed');
}).catch((error) => {
    logger.error('Database initialization failed', { error: error.message });
});
// free routes 
app.use('/metaverse/login', login_routes);
app.use('/metaverse/signup', signup_routes);
app.post('/metaverse/logout', log_out_router);

app.use('/metaverse/protected', protectedRoutes);
app.use('/metaverse/dashboard', dashboard_routes);
app.use('/metaverse/spaces', spaceRoutes);
app.use('/metaverse/notifications', notificationRoutes);
app.use('/metaverse/invites', inviteRoutes);
app.use('/metaverse/users', user_routes);

app.use('/int', internalRoutes);



logger.info('Express application configured successfully');
module.exports = {
    app,
    wsManager
};
