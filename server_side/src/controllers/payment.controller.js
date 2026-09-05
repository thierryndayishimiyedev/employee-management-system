const {
    payAllApprovedPayrolls,
    getPayments,
    getPaymentById,
    getPaymentReport,
    getPaymentReportCsv,
    getWorkerPaymentProof,
    deletePayment
} = require("../services/payment.service");
const { getPaymentReadiness } = require("../services/paymentProviders");

const readiness = async (_req, res) => res.json({ success: true, data: getPaymentReadiness() });

const payAll = async (req, res) => {

    try {

        const result = await payAllApprovedPayrolls(req.body || {}, req.user);

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

        const payments = await getPayments(req.user);

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

        const payment = await getPaymentById(req.params.id, req.user);

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

const fetchPaymentReport = async (req, res) => {

    try {

        const report = await getPaymentReport(req.user);

        res.json({
            success: true,
            data: report
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const downloadPaymentReport = async (req, res) => {

    try {

        const csv = await getPaymentReportCsv(req.user);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=payment-report.csv");
        res.send(csv);

    } catch (err) {

        res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const removePayment = async (req, res) => {

    try {

        await deletePayment(req.params.id, req.user);

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

const workerProof = async (req, res) => {
    try { res.json({ success: true, data: await getWorkerPaymentProof(req.query, req.user) }); }
    catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

module.exports = {
    payAll,
    fetchPayments,
    fetchPayment,
    fetchPaymentReport,
    workerProof,
    downloadPaymentReport,
    removePayment,
    readiness
};
