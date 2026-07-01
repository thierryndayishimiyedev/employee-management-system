const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    registerAdmin,
    fetchAdmins,
    fetchAdmin,
    editAdmin,
    removeAdmin
} = require("../controllers/admin.controller");

router.post("/", authenticate, registerAdmin);

router.get("/", authenticate, fetchAdmins);

router.get("/:id", authenticate, fetchAdmin);

router.put("/:id", authenticate, editAdmin);

router.delete("/:id", authenticate, removeAdmin);

module.exports = router;