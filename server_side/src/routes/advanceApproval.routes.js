const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const { approve, reject, pay, payAll } = require("../controllers/advanceApproval.controller");

router.put("/:id/approve", authenticate, authorize("MANAGER", "OWNER", "SUPER_ADMIN"), approve);
router.put("/:id/reject", authenticate, authorize("MANAGER", "OWNER", "SUPER_ADMIN"), reject);
router.post("/:id/pay", authenticate, authorize("OWNER", "SUPER_ADMIN"), pay);
router.post("/pay-all", authenticate, authorize("OWNER", "SUPER_ADMIN"), payAll);

module.exports = router;
