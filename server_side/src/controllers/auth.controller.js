const { login } = require("../services/auth.service");

const loginAdmin = async (req, res) => {

    try {

        const result = await login(req.body);

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token: result.token,
            admin: result.admin
        });

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    loginAdmin
};