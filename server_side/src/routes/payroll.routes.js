const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    createPayroll,
    fetchPayrolls,
    fetchPayroll,
    removePayroll
} = require("../controllers/payroll.controller");

router.post("/generate", authenticate, createPayroll);

router.get("/", authenticate, fetchPayrolls);

router.get("/:id", authenticate, fetchPayroll);

router.delete("/:id", authenticate, removePayroll);

module.exports = router;