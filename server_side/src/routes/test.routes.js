const express = require("express");

const router = express.Router();

const {
    testDatabase
} = require("../controllers/test.controller");

router.get("/", testDatabase);

module.exports = router;