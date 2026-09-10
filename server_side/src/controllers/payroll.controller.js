const {
    generatePayroll,
    generatePayrollForAll,
    getPayrollDateGuidance,
    getPayrolls,
    getPayrollSummary,
    getPayrollById,
    deletePayroll
} = require("../services/payroll.service");

const createPayroll = async (req, res) => {

    try {

        const payroll = await generatePayroll(req.body, req.user);

        res.status(201).json({
            success: true,
            message: "Payroll generated successfully.",
            data: payroll
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const createPayrollForAll = async (req, res) => {
    try {
        const result = await generatePayrollForAll(req.body, req.user);
        res.status(201).json({
            success: true,
            message: `${result.generated.length} payroll record(s) generated. ${result.skipped.length} already-calculated worker(s) skipped. ${result.failed.length} worker(s) need attention.`,
            data: result
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const fetchPayrollDateGuidance = async (req, res) => {
    try {
        res.json({ success: true, data: await getPayrollDateGuidance(req.user) });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const fetchPayrolls = async (req, res) => {

    try {

        const payrolls = await getPayrolls(req.user);

        res.json({
            success: true,
            data: payrolls
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchPayrollSummary = async (req, res) => {

    try {

        const summary = await getPayrollSummary(req.user);

        res.json({
            success: true,
            data: summary
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchPayroll = async (req, res) => {

    try {

        const payroll = await getPayrollById(req.params.id, req.user);

        res.json({
            success: true,
            data: payroll
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const removePayroll = async (req, res) => {

    try {

        await deletePayroll(req.params.id, req.user);

        res.json({
            success: true,
            message: "Payroll deleted successfully."
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = {
    createPayroll,
    createPayrollForAll,
    fetchPayrollDateGuidance,
    fetchPayrolls,
    fetchPayrollSummary,
    fetchPayroll,
    removePayroll
};
