// invite controller , takes in the request body and returns the response
function check_request_body(body){
    const { sender_email, rec_email, sender_id, rec_id } = body;
    if (sender_email && rec_email && !sender_id && !rec_id){
        return true;
    }
    else if (sender_id && rec_id && !sender_email && !rec_email){
        return true;
    }
    return false;
}
const invite_controller = async (req, res) => {
    const check_req = check_request_body(req.body);
    if (!check_req){
        return res.status(400).json({ message: "Invalid request body" });
    }
    // we only need a sender_email rec email or sender id or rec id 
    sender_email = req.body.sender_email;
    rec_email = req.body.rec_email;
    if (sender_email && rec_email){
        const sender_user = await get_user_by_email(req.body.sender_email);
        const rec_user = await get_user_by_email(req.body.rec_email);
    }
    else if (sender_id && rec_id){
        const sender_user = await get_user_by_id(req.body.sender_id);
        const rec_user = await get_user_by_id(req.body.rec_id);
    }
    // add the sender and rec user in the same space 
    const space_id = req.body.space_id;
    const space = await get_space_by_id(space_id);
    space.users.push(sender_user);
    space.users.push(rec_user);
    await space.save();
    res.status(200).json({ message: "Invite sent successfully" });
}

module.exports = { invite_controller };