const {
    approvePayroll,
    rejectPayroll
} = require("../services/payrollApproval.service");

const approve = async (req, res) => {

    try {

        const payroll = await approvePayroll(req.params.id, req.user);

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

const reject = async (req, res) => {

    try {

        const payroll = await rejectPayroll(req.params.id, req.user);

        res.json({
            success: true,
            message: "Payroll rejected.",
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
    approve,
    reject
};
