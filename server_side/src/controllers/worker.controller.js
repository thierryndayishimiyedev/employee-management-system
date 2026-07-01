const { createWorker } = require("../services/worker.service");

const registerWorker = async (req, res) => {

    try {

        const worker = await createWorker(req.body);

        res.status(201).json({
            success: true,
            message: "Worker registered successfully.",
            data: worker
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = {
    registerWorker
};