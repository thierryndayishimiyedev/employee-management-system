const {
    createWorker,
    getWorkers,
    getWorkerById,
    updateWorker,
    deactivateWorker
} = require("../services/worker.service");

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

const fetchWorkers = async (req, res) => {

    try {

        const workers = await getWorkers();

        res.json({
            success: true,
            data: workers
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchWorker = async (req, res) => {

    try {

        const worker = await getWorkerById(req.params.id);

        res.json({
            success: true,
            data: worker
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const editWorker = async (req, res) => {

    try {

        const worker = await updateWorker(
            req.params.id,
            req.body
        );

        res.json({
            success: true,
            message: "Worker updated successfully.",
            data: worker
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const removeWorker = async (req, res) => {

    try {

        await deactivateWorker(req.params.id);

        res.json({
            success: true,
            message: "Worker deactivated successfully."
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = {
    registerWorker,
    fetchWorkers,
    fetchWorker,
    editWorker,
    removeWorker
};