const express = require("express");

const router = express.Router();

const { loginManager } = require("../controllers/managerAuth.controller");

router.post("/login", loginManager);

module.exports = router;