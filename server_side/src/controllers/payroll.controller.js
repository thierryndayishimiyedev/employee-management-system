const { generatePayroll } = require("../services/payroll.service");

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

module.exports = {
    createPayroll
};