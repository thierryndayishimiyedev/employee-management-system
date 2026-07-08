const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    registerPosition,
    fetchPositions,
    fetchPosition,
    editPosition,
    removePosition
} = require("../controllers/position.controller");

router.post("/", authenticate, authorize("OWNER", "SUPER_ADMIN"), registerPosition);

router.get("/", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchPositions);

router.get("/:id", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchPosition);

router.put("/:id", authenticate, authorize("OWNER", "SUPER_ADMIN"), editPosition);

router.delete("/:id", authenticate, authorize("OWNER", "SUPER_ADMIN"), removePosition);

module.exports = router;
