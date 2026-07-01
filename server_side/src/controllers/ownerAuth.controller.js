const { ownerLogin } = require("../services/ownerAuth.service");

const loginOwner = async (req, res) => {

    try {

        const data = await ownerLogin(req.body);

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

module.exports = {
    loginOwner
};