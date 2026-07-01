const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    registerReport,
    fetchReports,
    fetchReport,
    readReport,
    sendReport,
    allowReportEdit,
    editReport
} = require("../controllers/report.controller");

router.post(
    "/",
    authenticate,
    registerReport
);

router.get(
    "/",
    authenticate,
    fetchReports
);

router.get(
    "/:id",
    authenticate,
    fetchReport
);

router.put(
    "/:id/read",
    authenticate,
    readReport
);

router.put(
    "/:id/send",
    authenticate,
    sendReport
);

router.put(
    "/:id/approve-edit",
    authenticate,
    allowReportEdit
);

router.put(
    "/:id",
    authenticate,
    editReport
);

module.exports = router;