const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    registerOwner
} = require("../controllers/owner.controller");

router.post(
    "/",
    authenticate,
    registerOwner
);

module.exports = router;