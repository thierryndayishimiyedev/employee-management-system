const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    fetchRoles,
    fetchRole
} = require("../controllers/role.controller");

router.get("/", authenticate, fetchRoles);

router.get("/:id", authenticate, fetchRole);

module.exports = router;