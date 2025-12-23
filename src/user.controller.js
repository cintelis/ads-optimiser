exports.getMe = (req, res) => {
    // Send the user data stored in the session
    res.json(req.session.user);
};