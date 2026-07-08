const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    approve,
    reject
} = require("../controllers/payrollApproval.controller");

router.put("/:id/approve", authenticate, authorize("OWNER", "SUPER_ADMIN"), approve);

router.put("/:id/reject", authenticate, authorize("OWNER", "SUPER_ADMIN"), reject);

module.exports = router;
