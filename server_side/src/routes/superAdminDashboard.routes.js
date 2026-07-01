const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    superAdminDashboard
} = require("../controllers/superAdminDashboard.controller");

router.get(
    "/",
    authenticate,
    authorize("SUPER_ADMIN"),
    superAdminDashboard
);

module.exports = router;