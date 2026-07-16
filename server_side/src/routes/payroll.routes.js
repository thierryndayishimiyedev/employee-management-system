const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    createPayroll,
    fetchPayrolls,
    fetchPayrollSummary,
    fetchPayroll,
    removePayroll
} = require("../controllers/payroll.controller");

router.post("/generate", authenticate, authorize("ACCOUNTANT", "SUPER_ADMIN"), createPayroll);

router.get("/", authenticate, authorize("OWNER", "ACCOUNTANT", "SUPER_ADMIN"), fetchPayrolls);

router.get("/summary/monthly", authenticate, authorize("OWNER", "ACCOUNTANT", "SUPER_ADMIN"), fetchPayrollSummary);

router.get("/:id", authenticate, authorize("OWNER", "ACCOUNTANT", "SUPER_ADMIN"), fetchPayroll);

router.delete("/:id", authenticate, authorize("ACCOUNTANT", "SUPER_ADMIN"), removePayroll);

module.exports = router;
