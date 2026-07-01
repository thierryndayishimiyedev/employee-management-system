const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    registerAdmin
} = require("../controllers/admin.controller");

router.post(
    "/",
    authenticate,
    registerAdmin
);

module.exports = router;