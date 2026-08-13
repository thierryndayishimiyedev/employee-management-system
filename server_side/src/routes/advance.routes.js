const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    createAdvance,
    fetchAdvanceEligibility,
    fetchAdvances,
    fetchAdvance,
    editAdvance,
    removeAdvance
} = require("../controllers/advance.controller");

router.post("/", authenticate, authorize("ACCOUNTANT", "OWNER", "SUPER_ADMIN"), createAdvance);

router.get("/", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchAdvances);

router.get("/eligibility/:employeeId", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchAdvanceEligibility);

router.get("/:id", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchAdvance);

router.put("/:id", authenticate, authorize("ACCOUNTANT", "OWNER", "SUPER_ADMIN"), editAdvance);

router.delete("/:id", authenticate, authorize("ACCOUNTANT", "OWNER", "SUPER_ADMIN"), removeAdvance);

module.exports = router;
