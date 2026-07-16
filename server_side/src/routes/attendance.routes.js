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
const authorize = require("../middleware/authorize.middleware");

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
    authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"),
    createAttendance
);

router.get(
    "/",
    authenticate,
    authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"),
    fetchAttendances
);

router.get(
    "/dashboard",
    authenticate,
    authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"),
    fetchAttendanceDashboard
);

router.get(
    "/weekly",
    authenticate,
    authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"),
    fetchWeeklyAttendance
);

router.get(
    "/today",
    authenticate,
    authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"),
    fetchTodayAttendance
);

router.get(
    "/employee/:employeeId",
    authenticate,
    authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"),
    fetchEmployeeAttendance
);

router.get(
    "/monthly-summary",
    authenticate,
    authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"),
    fetchMonthlyAttendanceSummary
);

router.get(
    "/:id",
    authenticate,
    authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"),
    fetchAttendance
);

router.put(
    "/:id",
    authenticate,
    authorize("OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"),
    editAttendance
);

router.delete(
    "/:id",
    authenticate,
    authorize("OWNER", "MANAGER", "SUPER_ADMIN"),
    removeAttendance
);

module.exports = router;
