const {
    createReport,
    getReports,
    getReportById,
    markReportAsRead,
    submitReport,
    approveReportEdit,
    updateReport
} = require("../services/report.service");

const registerReport = async (req, res) => {

    try {

        const report = await createReport(
            req.body,
            req.user
        );

        res.status(201).json({
            success: true,
            message: "Report created successfully.",
            data: report
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const fetchReports = async (req, res) => {

    try {

        const reports = await getReports(req.user);

        res.json({
            success: true,
            data: reports
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const fetchReport = async (req, res) => {

    try {

        const report = await getReportById(
            req.params.id,
            req.user
        );

        res.json({
            success: true,
            data: report
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const readReport = async (req, res) => {

    try {

        const report = await markReportAsRead(
            req.params.id,
            req.user
        );

        res.json({
            success: true,
            message: "Report marked as read.",
            data: report
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const sendReport = async (req, res) => {

    try {

        const report = await submitReport(
            req.params.id,
            req.user
        );

        res.json({
            success: true,
            message: "Report submitted successfully.",
            data: report
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const allowReportEdit = async (req, res) => {

    try {

        const report = await approveReportEdit(
            req.params.id,
            req.user
        );

        res.json({
            success: true,
            message: "Owner approved report editing.",
            data: report
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

const editReport = async (req, res) => {

    try {

        const report = await updateReport(
            req.params.id,
            req.body,
            req.user
        );

        res.json({
            success: true,
            message: "Report updated successfully.",
            data: report
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    registerReport,
    fetchReports,
    fetchReport,
    readReport,
    sendReport,
    allowReportEdit,
    editReport
};
