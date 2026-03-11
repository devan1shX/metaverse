const dashboard_routes = require('express').Router();
const { dashboard_controller } = require('../../controllers/dashboard');
const { verifyAuthToken, attachDbUser } = require('../../middleware/firebaseAuth');

// Allow both Firebase-authenticated (Google) users and traditional JWT users
dashboard_routes.get('/', verifyAuthToken, attachDbUser, dashboard_controller);

module.exports = { dashboard_routes };