const express = require('express');
const router = express.Router();
const { invite_controller } = require('../../../controllers/invite');
/*
request body : 
    {
        sender_name : string,
        rec_name : string,
        sender_email : string , 
        rec_email: string , 
        space_id : string,
        message : string,
        status: string
    }
*/

/**
 * the invite functionality means a user can invite another user to a space by eighter their email or their username to a space ( we 
 * can extend that to inviting the user to private rooms etc )
 */
router.post('/invite', invite_controller);

module.exports = router;