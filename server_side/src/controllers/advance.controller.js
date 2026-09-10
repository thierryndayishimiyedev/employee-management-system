const {
    requestAdvance,
    requestAdvancesForAllEligibleWorkers,
    getAdvanceEligibility,
    getAdvances,
    getAdvanceById,
    updateAdvance,
    deleteAdvance
} = require("../services/advance.service");

const fetchAdvanceEligibility = async (req, res) => {
    try {
        res.json({ success: true, data: await getAdvanceEligibility(req.params.employeeId, req.user) });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const createAdvance = async (req, res) => {

    try {

        const advance = await requestAdvance(req.body, req.user);

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

const createAdvancesForAll = async (req, res) => {
    try {
        const result = await requestAdvancesForAllEligibleWorkers(req.body, req.user);
        res.status(201).json({
            success: true,
            message: `${result.requested.length} advance request(s) created. ${result.skipped.length} worker(s) are not eligible yet. ${result.failed.length} failed.`,
            data: result
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const fetchAdvances = async (req, res) => {

    try {

        const advances = await getAdvances(req.user);

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

        const advance = await getAdvanceById(req.params.id, req.user);

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
            req.body,
            req.user
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

        await deleteAdvance(req.params.id, req.user);

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
    createAdvancesForAll,
    fetchAdvanceEligibility,
    fetchAdvances,
    fetchAdvance,
    editAdvance,
    removeAdvance
};
