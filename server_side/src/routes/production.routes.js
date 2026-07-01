const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const { createProduction } = require("../controllers/production.controller");

router.post("/", authenticate, createProduction);

module.exports = router;