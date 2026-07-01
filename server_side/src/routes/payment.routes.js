const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    payAll,
    fetchPayments,
    fetchPayment,
    removePayment
} = require("../controllers/payment.controller");

router.post("/pay-all", authenticate, payAll);

router.get("/", authenticate, fetchPayments);

router.get("/:id", authenticate, fetchPayment);

router.delete("/:id", authenticate, removePayment);

module.exports = router;