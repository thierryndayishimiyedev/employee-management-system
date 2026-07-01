const {
    generatePayroll,
    getPayrolls,
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
            payroll_year
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

        const payrolls = await getPayrolls();

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

const fetchPayroll = async (req, res) => {

    try {

        const payroll = await getPayrollById(req.params.id);

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

        await deletePayroll(req.params.id);

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
    fetchPayroll,
    removePayroll
};