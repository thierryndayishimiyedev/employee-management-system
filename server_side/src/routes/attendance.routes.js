// const express = require("express");

// const router = express.Router();

// const authenticate = require("../middleware/auth.middleware");

// const {
//     createAttendance,
//     fetchAttendances,
//     fetchAttendance,
//     editAttendance,
//     removeAttendance
// } = require("../controllers/attendance.controller");

// router.post(
//     "/",
//     authenticate,
//     createAttendance
// );

// router.get(
//     "/",
//     authenticate,
//     fetchAttendances
// );

// router.get(
//     "/:id",
//     authenticate,
//     fetchAttendance
// );

// router.put(
//     "/:id",
//     authenticate,
//     editAttendance
// );

// router.delete(
//     "/:id",
//     authenticate,
//     removeAttendance
// );

// module.exports = router;


const express = require("express");

const router = express.Router();

const authenticate = require("../middleware/auth.middleware");

const {
    createAttendance,
    fetchAttendances,
    fetchAttendance,
    editAttendance,
    removeAttendance,
    fetchAttendanceDashboard,
    fetchWeeklyAttendance,
    fetchTodayAttendance,
    fetchEmployeeAttendance,
    fetchMonthlyAttendanceSummary
} = require("../controllers/attendance.controller");

router.post(
    "/",
    authenticate,
    createAttendance
);

router.get(
    "/",
    authenticate,
    fetchAttendances
);

router.get(
    "/dashboard",
    authenticate,
    fetchAttendanceDashboard
);

router.get(
    "/weekly",
    authenticate,
    fetchWeeklyAttendance
);

router.get(
    "/today",
    authenticate,
    fetchTodayAttendance
);

router.get(
    "/employee/:employeeId",
    authenticate,
    fetchEmployeeAttendance
);

router.get(
    "/monthly-summary",
    authenticate,
    fetchMonthlyAttendanceSummary
);

router.get(
    "/:id",
    authenticate,
    fetchAttendance
);

router.put(
    "/:id",
    authenticate,
    editAttendance
);

router.delete(
    "/:id",
    authenticate,
    removeAttendance
);

module.exports = router;