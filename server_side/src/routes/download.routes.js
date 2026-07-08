const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    downloadReportPdf
} = require("../controllers/download.controller");

router.get(
    "/:type/pdf",
    authenticate,
    authorize("SUPER_ADMIN", "OWNER", "MANAGER", "ACCOUNTANT"),
    downloadReportPdf
);

module.exports = router;
