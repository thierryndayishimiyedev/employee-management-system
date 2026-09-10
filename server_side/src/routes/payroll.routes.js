const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    createPayroll,
    createPayrollForAll,
    fetchPayrollDateGuidance,
    fetchPayrolls,
    fetchPayrollSummary,
    fetchPayroll,
    removePayroll
} = require("../controllers/payroll.controller");

router.post("/generate", authenticate, authorize("ACCOUNTANT", "SUPER_ADMIN"), createPayroll);
router.post("/generate-all", authenticate, authorize("ACCOUNTANT", "SUPER_ADMIN"), createPayrollForAll);
router.get("/guidance", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchPayrollDateGuidance);

router.get("/", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchPayrolls);

router.get("/summary/monthly", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchPayrollSummary);

router.get("/:id", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchPayroll);

router.delete("/:id", authenticate, authorize("ACCOUNTANT", "SUPER_ADMIN"), removePayroll);

module.exports = router;
