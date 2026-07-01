const {
    recordProduction,
    getProductions,
    getProductionById,
    updateProduction,
    deleteProduction
} = require("../services/production.service");

const createProduction = async (req, res) => {

    try {

        const production = await recordProduction(req.body);

        res.status(201).json({
            success: true,
            message: "Production recorded successfully.",
            data: production
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchProductions = async (req, res) => {

    try {

        const productions = await getProductions();

        res.json({
            success: true,
            data: productions
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchProduction = async (req, res) => {

    try {

        const production = await getProductionById(req.params.id);

        res.json({
            success: true,
            data: production
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const editProduction = async (req, res) => {

    try {

        const production = await updateProduction(
            req.params.id,
            req.body
        );

        res.json({
            success: true,
            message: "Production updated successfully.",
            data: production
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const removeProduction = async (req, res) => {

    try {

        await deleteProduction(req.params.id);

        res.json({
            success: true,
            message: "Production deleted successfully."
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = {
    createProduction,
    fetchProductions,
    fetchProduction,
    editProduction,
    removeProduction
};