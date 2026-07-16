const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    registerDepartment,
    fetchDepartments,
    fetchDepartment,
    editDepartment,
    removeDepartment
} = require("../controllers/department.controller");

router.post("/", authenticate, authorize("OWNER", "SUPER_ADMIN"), registerDepartment);

router.get("/", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchDepartments);

router.get("/:id", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchDepartment);

router.put("/:id", authenticate, authorize("OWNER", "SUPER_ADMIN"), editDepartment);

router.delete("/:id", authenticate, authorize("OWNER", "SUPER_ADMIN"), removeDepartment);

module.exports = router;
