const {
    createManager,
    getManagers,
    getManagerById,
    updateManager,
    deactivateManager
} = require("../services/manager.service");

const registerManager = async (req, res) => {

    try {

        const manager = await createManager(req.body);

        res.status(201).json({
            success: true,
            message: "Manager created successfully.",
            data: manager
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchManagers = async (req, res) => {

    try {

        const managers = await getManagers();

        res.json({
            success: true,
            data: managers
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchManager = async (req, res) => {

    try {

        const manager = await getManagerById(req.params.id);

        res.json({
            success: true,
            data: manager
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const editManager = async (req, res) => {

    try {

        const manager = await updateManager(
            req.params.id,
            req.body
        );

        res.json({
            success: true,
            message: "Manager updated successfully.",
            data: manager
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const removeManager = async (req, res) => {

    try {

        await deactivateManager(req.params.id);

        res.json({
            success: true,
            message: "Manager deactivated successfully."
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = {
    registerManager,
    fetchManagers,
    fetchManager,
    editManager,
    removeManager
};