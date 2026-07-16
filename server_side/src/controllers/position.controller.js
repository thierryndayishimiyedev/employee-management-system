const {
    createPosition,
    getPositions,
    getPositionById,
    updatePosition,
    deletePosition
} = require("../services/position.service");

const registerPosition = async (req, res) => {

    try {

        const position = await createPosition(req.body, req.user);

        res.status(201).json({
            success: true,
            message: "Position created successfully.",
            data: position
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const fetchPositions = async (req, res) => {

    try {

        const positions = await getPositions(req.user);

        res.json({
            success: true,
            data: positions
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const fetchPosition = async (req, res) => {

    try {

        const position = await getPositionById(req.params.id, req.user);

        res.json({
            success: true,
            data: position
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const editPosition = async (req, res) => {

    try {

        const position = await updatePosition(
            req.params.id,
            req.body,
            req.user
        );

        res.json({
            success: true,
            message: "Position updated successfully.",
            data: position
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const removePosition = async (req, res) => {

    try {

        await deletePosition(req.params.id, req.user);

        res.json({
            success: true,
            message: "Position deleted successfully."
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    registerPosition,
    fetchPositions,
    fetchPosition,
    editPosition,
    removePosition
};
