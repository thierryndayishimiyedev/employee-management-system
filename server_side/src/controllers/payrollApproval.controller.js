const { approvePayroll } = require("../services/payrollApproval.service");

const approve = async (req, res) => {

    try {

        const payroll = await approvePayroll(req.params.id);

        res.json({
            success: true,
            message: "Payroll approved successfully.",
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
    approve
};