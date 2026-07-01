const express = require("express");

const router = express.Router();

const { loginOwner } = require("../controllers/ownerAuth.controller");

router.post("/login", loginOwner);

module.exports = router;