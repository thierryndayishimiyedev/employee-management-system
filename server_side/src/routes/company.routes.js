const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    registerCompany,
    fetchCompanies,
    fetchCompany,
    editCompany,
    removeCompany
} = require("../controllers/company.controller");

router.post("/", authenticate, registerCompany);

router.get("/", authenticate, fetchCompanies);

router.get("/:id", authenticate, fetchCompany);

router.put("/:id", authenticate, editCompany);

router.delete("/:id", authenticate, removeCompany);

module.exports = router;