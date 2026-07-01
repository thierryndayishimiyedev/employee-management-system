const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    ownerDashboard,
    accountantDashboard,
    managerDashboard
} = require("../controllers/dashboard.controller");

router.get(
    "/owner",
    authenticate,
    authorize("OWNER"),
    ownerDashboard
);

router.get(
    "/accountant",
    authenticate,
    authorize("ACCOUNTANT"),
    accountantDashboard
);

router.get(
    "/manager",
    authenticate,
    authorize("MANAGER"),
    managerDashboard
);

module.exports = router;