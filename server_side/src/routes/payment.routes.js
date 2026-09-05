const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    payAll,
    fetchPayments,
    fetchPayment,
    fetchPaymentReport,
    workerProof,
    downloadPaymentReport,
    removePayment,
    readiness
} = require("../controllers/payment.controller");

// Wallet readiness and the future live SIM balance are Owner-only financial data.
router.get("/readiness", authenticate, authorize("OWNER"), readiness);
router.post("/pay-all", authenticate, authorize("OWNER", "SUPER_ADMIN"), payAll);

router.get("/", authenticate, authorize("OWNER", "SUPER_ADMIN"), fetchPayments);

router.get("/report", authenticate, authorize("OWNER", "SUPER_ADMIN"), fetchPaymentReport);
router.get("/worker-proof", authenticate, authorize("OWNER", "SUPER_ADMIN"), workerProof);

router.get("/report/download", authenticate, authorize("OWNER", "SUPER_ADMIN"), downloadPaymentReport);

router.get("/:id", authenticate, authorize("OWNER", "SUPER_ADMIN"), fetchPayment);

router.delete("/:id", authenticate, authorize("OWNER", "SUPER_ADMIN"), removePayment);

module.exports = router;
