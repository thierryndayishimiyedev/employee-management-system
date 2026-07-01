const {
    requestAdvance,
    getAdvances,
    getAdvanceById,
    updateAdvance,
    deleteAdvance
} = require("../services/advance.service");

const createAdvance = async (req, res) => {

    try {

        const advance = await requestAdvance(req.body);

        res.status(201).json({
            success: true,
            message: "Advance requested successfully.",
            data: advance
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchAdvances = async (req, res) => {

    try {

        const advances = await getAdvances();

        res.json({
            success: true,
            data: advances
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchAdvance = async (req, res) => {

    try {

        const advance = await getAdvanceById(req.params.id);

        res.json({
            success: true,
            data: advance
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const editAdvance = async (req, res) => {

    try {

        const advance = await updateAdvance(
            req.params.id,
            req.body
        );

        res.json({
            success: true,
            message: "Advance updated successfully.",
            data: advance
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const removeAdvance = async (req, res) => {

    try {

        await deleteAdvance(req.params.id);

        res.json({
            success: true,
            message: "Advance deleted successfully."
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = {
    createAdvance,
    fetchAdvances,
    fetchAdvance,
    editAdvance,
    removeAdvance
};