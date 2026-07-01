const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    registerCompany,
    fetchCompanies
} = require("../controllers/company.controller");

router.post("/", authenticate, registerCompany);

router.get("/", authenticate, fetchCompanies);

module.exports = router;