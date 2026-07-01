const {
    payAllApprovedPayrolls,
    getPayments,
    getPaymentById,
    deletePayment
} = require("../services/payment.service");

const payAll = async (req, res) => {

    try {

        const result = await payAllApprovedPayrolls();

        res.json({
            success: true,
            message: "Payments completed.",
            data: result
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchPayments = async (req, res) => {

    try {

        const payments = await getPayments();

        res.json({
            success: true,
            data: payments
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchPayment = async (req, res) => {

    try {

        const payment = await getPaymentById(req.params.id);

        res.json({
            success: true,
            data: payment
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const removePayment = async (req, res) => {

    try {

        await deletePayment(req.params.id);

        res.json({
            success: true,
            message: "Payment deleted successfully."
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = {
    payAll,
    fetchPayments,
    fetchPayment,
    removePayment
};