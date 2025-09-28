const dashboard_routes = require('express').Router();
const { dashboard_controller } = require('../../controllers/dashboard');
const { authenticateToken } = require('../../middleware/auth');
dashboard_routes.get('/', authenticateToken, dashboard_controller);

module.exports = {dashboard_routes};