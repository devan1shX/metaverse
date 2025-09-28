const express = require('express');
const { logger } = require('../../utils/logger');
const { update_avatar_controller } = require('../../controllers/userController');
const user_routes = express.Router();

// Route for PATCH /metaverse/v1/users/:id/avatar
user_routes.patch('/:id/avatar', (req, res) => {
    logger.info('Update avatar route accessed', { userId: req.params.id });
    update_avatar_controller(req, res);
});

module.exports = { user_routes };