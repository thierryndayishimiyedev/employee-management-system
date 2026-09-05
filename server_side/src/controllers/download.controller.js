const {
    buildReportPdf,
    buildReportCsv,
    sendPdf
} = require("../services/download.service");

const downloadReportPdf = async (req, res) => {
    try {
        const type = req.params.type;
        const buffer = await buildReportPdf(type, req.user, req.query);
        sendPdf(res, `${type}-report.pdf`, buffer);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const downloadReportCsv = async (req, res) => {
    try {
        const type = req.params.type;
        const buffer = await buildReportCsv(type, req.user, req.query);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=${type}-report.csv`);
        res.send(buffer);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    downloadReportPdf,
    downloadReportCsv
};
