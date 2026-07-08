const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    createProduction,
    fetchProductions,
    fetchProduction,
    editProduction,
    removeProduction
} = require("../controllers/production.controller");

router.post("/", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), createProduction);

router.get("/", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchProductions);

router.get("/:id", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchProduction);

router.put("/:id", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), editProduction);

router.delete("/:id", authenticate, authorize("OWNER", "MANAGER", "SUPER_ADMIN"), removeProduction);

module.exports = router;
