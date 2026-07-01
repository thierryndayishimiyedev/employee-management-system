const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    createAttendance,
    fetchAttendances,
    fetchAttendance,
    editAttendance,
    removeAttendance
} = require("../controllers/attendance.controller");

router.post("/", authenticate, createAttendance);

router.get("/", authenticate, fetchAttendances);

router.get("/:id", authenticate, fetchAttendance);

router.put("/:id", authenticate, editAttendance);

router.delete("/:id", authenticate, removeAttendance);

module.exports = router;