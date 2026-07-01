const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    registerWorker,
    fetchWorkers,
    fetchWorker,
    editWorker,
    removeWorker
} = require("../controllers/worker.controller");

router.post("/", authenticate, registerWorker);

router.get("/", authenticate, fetchWorkers);

router.get("/:id", authenticate, fetchWorker);

router.put("/:id", authenticate, editWorker);

router.delete("/:id", authenticate, removeWorker);

module.exports = router;