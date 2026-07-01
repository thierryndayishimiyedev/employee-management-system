const { accountantLogin } = require("../services/accountantAuth.service");

const loginAccountant = async (req, res) => {

    try {

        const data = await accountantLogin(req.body);

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

module.exports = { loginAccountant };