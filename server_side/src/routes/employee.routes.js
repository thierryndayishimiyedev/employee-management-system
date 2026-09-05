const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const { fetchEmployeesForAttendance } = require("../controllers/employee.controller");

// This endpoint feeds operational worker selectors (attendance, production,
// consumptions). Keep it unavailable to unrelated account types.
router.get("/", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchEmployeesForAttendance);

module.exports = router;
