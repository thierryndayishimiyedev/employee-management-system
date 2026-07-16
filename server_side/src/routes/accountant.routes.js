const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    registerAccountant,
    fetchAccountants,
    fetchAccountant,
    editAccountant,
    removeAccountant
} = require("../controllers/accountant.controller");

router.post("/", authenticate, authorize("OWNER", "SUPER_ADMIN"), registerAccountant);

router.get("/", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchAccountants);

router.get("/:id", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchAccountant);

router.put("/:id", authenticate, authorize("OWNER", "SUPER_ADMIN"), editAccountant);

router.delete("/:id", authenticate, authorize("OWNER", "SUPER_ADMIN"), removeAccountant);

module.exports = router;
