const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const { approve } = require("../controllers/payrollApproval.controller");

router.put("/:id/approve", authenticate, approve);

module.exports = router;