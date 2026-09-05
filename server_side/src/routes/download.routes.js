const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    downloadReportPdf,
    downloadReportCsv
} = require("../controllers/download.controller");

router.get(
    "/:type/pdf",
    authenticate,
    authorize("SUPER_ADMIN", "OWNER", "MANAGER", "ACCOUNTANT", "FOOD_SUPPLIER"),
    downloadReportPdf
);

router.get(
    "/:type/csv",
    authenticate,
    authorize("SUPER_ADMIN", "OWNER", "MANAGER", "ACCOUNTANT", "FOOD_SUPPLIER"),
    downloadReportCsv
);

module.exports = router;
