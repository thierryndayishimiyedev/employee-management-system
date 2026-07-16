const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    registerWorker,
    fetchWorkers,
    fetchWorker,
    editWorker,
    removeWorker
} = require("../controllers/worker.controller");

router.post("/", authenticate, authorize("OWNER", "MANAGER", "SUPER_ADMIN"), registerWorker);

router.get("/", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchWorkers);

router.get("/:id", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"), fetchWorker);

router.put("/:id", authenticate, authorize("OWNER", "MANAGER", "SUPER_ADMIN"), editWorker);

router.delete("/:id", authenticate, authorize("OWNER", "MANAGER", "SUPER_ADMIN"), removeWorker);

module.exports = router;
