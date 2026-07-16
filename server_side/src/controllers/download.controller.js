const {
    buildReportPdf,
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

module.exports = {
    downloadReportPdf
};
