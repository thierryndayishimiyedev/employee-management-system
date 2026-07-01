const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    createAdvance,
    fetchAdvances,
    fetchAdvance,
    editAdvance,
    removeAdvance
} = require("../controllers/advance.controller");

router.post("/", authenticate, createAdvance);

router.get("/", authenticate, fetchAdvances);

router.get("/:id", authenticate, fetchAdvance);

router.put("/:id", authenticate, editAdvance);

router.delete("/:id", authenticate, removeAdvance);

module.exports = router;