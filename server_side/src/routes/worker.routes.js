const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const { registerWorker } = require("../controllers/worker.controller");

router.post("/", authenticate, registerWorker);

module.exports = router;