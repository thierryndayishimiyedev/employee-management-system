const {
    getOwnerDashboard,
    getAccountantDashboard,
    getManagerDashboard
} = require("../services/dashboard.service");

const ownerDashboard = async (req, res) => {

    try {

        const data = await getOwnerDashboard(req.user, req.query);

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

const accountantDashboard = async (req, res) => {

    try {

        const data = await getAccountantDashboard(req.user);

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

const managerDashboard = async (req, res) => {

    try {

        const data = await getManagerDashboard(req.user);

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
    ownerDashboard,
    accountantDashboard,
    managerDashboard
};
