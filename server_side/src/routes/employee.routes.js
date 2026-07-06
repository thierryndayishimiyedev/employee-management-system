const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.middleware");
const { fetchEmployeesForAttendance } = require("../controllers/employee.controller");

router.get("/", authenticate, fetchEmployeesForAttendance);

module.exports = router;
