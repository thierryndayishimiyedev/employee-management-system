const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    registerPosition,
    fetchPositions,
    fetchPosition,
    editPosition,
    removePosition
} = require("../controllers/position.controller");

router.post("/", authenticate, registerPosition);

router.get("/", authenticate, fetchPositions);

router.get("/:id", authenticate, fetchPosition);

router.put("/:id", authenticate, editPosition);

router.delete("/:id", authenticate, removePosition);

module.exports = router;