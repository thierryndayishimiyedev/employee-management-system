const { managerLogin } = require("../services/managerAuth.service");

const loginManager = async (req, res) => {

    try {

        const data = await managerLogin(req.body);

        res.json({
            success: true,
            message: "Login successful.",
            data
        });

    } catch (err) {

        res.status(401).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = { loginManager };