const {
    getSuperAdminDashboard
} = require("../services/superAdminDashboard.service");

const superAdminDashboard = async (req, res) => {

    try {

        const data = await getSuperAdminDashboard();

        res.json({
            success: true,
            data
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    superAdminDashboard
};