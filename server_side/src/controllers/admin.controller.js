const { createAdmin } = require("../services/admin.service");

const registerAdmin = async (req, res) => {

    try {

        const admin = await createAdmin(req.body);

        return res.status(201).json({
            success: true,
            message: "Super Admin created successfully.",
            data: admin
        });

    } catch (error) {

        return res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    registerAdmin
};