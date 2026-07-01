const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    createProduction,
    fetchProductions,
    fetchProduction,
    editProduction,
    removeProduction
} = require("../controllers/production.controller");

router.post("/", authenticate, createProduction);

router.get("/", authenticate, fetchProductions);

router.get("/:id", authenticate, fetchProduction);

router.put("/:id", authenticate, editProduction);

router.delete("/:id", authenticate, removeProduction);

module.exports = router;