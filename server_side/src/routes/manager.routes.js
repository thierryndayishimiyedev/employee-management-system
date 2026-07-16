const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    registerManager,
    fetchManagers,
    fetchManager,
    editManager,
    removeManager
} = require("../controllers/manager.controller");

router.post("/", authenticate, authorize("OWNER", "SUPER_ADMIN"), registerManager);

router.get("/", authenticate, authorize("OWNER", "MANAGER", "SUPER_ADMIN"), fetchManagers);

router.get("/:id", authenticate, authorize("OWNER", "MANAGER", "SUPER_ADMIN"), fetchManager);

router.put("/:id", authenticate, authorize("OWNER", "SUPER_ADMIN"), editManager);

router.delete("/:id", authenticate, authorize("OWNER", "SUPER_ADMIN"), removeManager);

module.exports = router;
