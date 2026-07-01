const { recordProduction } = require("../services/production.service");

const createProduction = async (req, res) => {

    try {

        const production = await recordProduction(req.body, req.user);

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

module.exports = { createProduction };