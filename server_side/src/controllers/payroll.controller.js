const {
    generatePayroll,
    getPayrolls,
    getPayrollSummary,
    getPayrollById,
    deletePayroll
} = require("../services/payroll.service");

const createPayroll = async (req, res) => {

    try {

        const {
            employee_id,
            payroll_month,
            payroll_year
        } = req.body;

        const payroll = await generatePayroll(
            employee_id,
            payroll_month,
            payroll_year,
            req.user
        );

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
    fetchPayrolls,
    fetchPayrollSummary,
    fetchPayroll,
    removePayroll
};
