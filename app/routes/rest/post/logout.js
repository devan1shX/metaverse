// log out routes for all the users will be here 
const express = require('express')
const { logger } = require('../../../utils/logger')
const log_out_router = express.Router();
const { log_out_router: log_out_controller } = require('../../../controllers/logout')

log_out_router.post('/', (req, res) => {
    logger.info('Logout route accessed', { ip: req.ip, userAgent: req.get('User-Agent') });
    log_out_controller(req, res);
});

module.exports = { log_out_router };