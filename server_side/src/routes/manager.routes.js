const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    registerManager,
    fetchManagers,
    fetchManager,
    editManager,
    removeManager
} = require("../controllers/manager.controller");

router.post("/", authenticate, registerManager);

router.get("/", authenticate, fetchManagers);

router.get("/:id", authenticate, fetchManager);

router.put("/:id", authenticate, editManager);

router.delete("/:id", authenticate, removeManager);

module.exports = router;