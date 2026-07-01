const express = require("express");

const router = express.Router();

const { loginAccountant } = require("../controllers/accountantAuth.controller");

router.post("/login", loginAccountant);

module.exports = router;