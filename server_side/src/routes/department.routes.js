const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    registerDepartment,
    fetchDepartments,
    fetchDepartment,
    editDepartment,
    removeDepartment
} = require("../controllers/department.controller");

router.post("/", authenticate, registerDepartment);

router.get("/", authenticate, fetchDepartments);

router.get("/:id", authenticate, fetchDepartment);

router.put("/:id", authenticate, editDepartment);

router.delete("/:id", authenticate, removeDepartment);

module.exports = router;