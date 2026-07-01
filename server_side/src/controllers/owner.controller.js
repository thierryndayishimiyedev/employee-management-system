const {
    createOwner,
    getOwners,
    getOwnerById,
    updateOwner,
    deactivateOwner
} = require("../services/owner.service");

const registerOwner = async (req, res) => {

    try {

        const owner = await createOwner(req.body);

        res.status(201).json({
            success: true,
            message: "Owner created successfully.",
            data: owner
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const fetchOwners = async (req, res) => {

    try {

        const owners = await getOwners();

        res.json({
            success: true,
            data: owners
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const fetchOwner = async (req, res) => {

    try {

        const owner = await getOwnerById(req.params.id);

        res.json({
            success: true,
            data: owner
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const editOwner = async (req, res) => {

    try {

        const owner = await updateOwner(
            req.params.id,
            req.body
        );

        res.json({
            success: true,
            message: "Owner updated successfully.",
            data: owner
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const removeOwner = async (req, res) => {

    try {

        await deactivateOwner(req.params.id);

        res.json({
            success: true,
            message: "Owner deactivated successfully."
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    registerOwner,
    fetchOwners,
    fetchOwner,
    editOwner,
    removeOwner
};