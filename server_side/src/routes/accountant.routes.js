const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    registerAccountant,
    fetchAccountants,
    fetchAccountant,
    editAccountant,
    removeAccountant
} = require("../controllers/accountant.controller");

router.post("/", authenticate, registerAccountant);

router.get("/", authenticate, fetchAccountants);

router.get("/:id", authenticate, fetchAccountant);

router.put("/:id", authenticate, editAccountant);

router.delete("/:id", authenticate, removeAccountant);

module.exports = router;