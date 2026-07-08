const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

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
    authorize("ACCOUNTANT", "SUPER_ADMIN"),
    registerReport
);

router.get(
    "/",
    authenticate,
    authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"),
    fetchReports
);

router.get(
    "/:id",
    authenticate,
    authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"),
    fetchReport
);

router.put(
    "/:id/read",
    authenticate,
    authorize("OWNER", "MANAGER", "SUPER_ADMIN"),
    readReport
);

router.put(
    "/:id/send",
    authenticate,
    authorize("ACCOUNTANT", "SUPER_ADMIN"),
    sendReport
);

router.put(
    "/:id/approve-edit",
    authenticate,
    authorize("OWNER", "SUPER_ADMIN"),
    allowReportEdit
);

router.put(
    "/:id",
    authenticate,
    authorize("ACCOUNTANT", "OWNER", "SUPER_ADMIN"),
    editReport
);

module.exports = router;
