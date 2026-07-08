// const {
//     recordAttendance,
//     getAttendances,
//     getAttendanceById,
//     updateAttendance,
//     deleteAttendance
// } = require("../services/attendance.service");

// const createAttendance = async (req, res) => {

//     try {

//         const attendance = await recordAttendance(
//             req.body,
//             req.user
//         );

//         return res.status(201).json({
//             success: true,
//             message: "Attendance recorded successfully.",
//             data: attendance
//         });

//     } catch (err) {

//         return res.status(400).json({
//             success: false,
//             message: err.message
//         });

//     }

// };

// const fetchAttendances = async (req, res) => {

//     try {

//         const attendances = await getAttendances();

//         return res.status(200).json({
//             success: true,
//             data: attendances
//         });

//     } catch (err) {

//         return res.status(400).json({
//             success: false,
//             message: err.message
//         });

//     }

// };

// const fetchAttendance = async (req, res) => {

//     try {

//         const attendance = await getAttendanceById(
//             req.params.id
//         );

//         return res.status(200).json({
//             success: true,
//             data: attendance
//         });

//     } catch (err) {

//         return res.status(400).json({
//             success: false,
//             message: err.message
//         });

//     }

// };

// const editAttendance = async (req, res) => {

//     try {

//         const attendance = await updateAttendance(
//             req.params.id,
//             req.body
//         );

//         return res.status(200).json({
//             success: true,
//             message: "Attendance updated successfully.",
//             data: attendance
//         });

//     } catch (err) {

//         return res.status(400).json({
//             success: false,
//             message: err.message
//         });

//     }

// };

// const removeAttendance = async (req, res) => {

//     try {

//         await deleteAttendance(req.params.id);

//         return res.status(200).json({
//             success: true,
//             message: "Attendance deleted successfully."
//         });

//     } catch (err) {

//         return res.status(400).json({
//             success: false,
//             message: err.message
//         });

//     }

// };

// module.exports = {
//     createAttendance,
//     fetchAttendances,
//     fetchAttendance,
//     editAttendance,
//     removeAttendance
// };

const {
    recordAttendance,
    getAttendances,
    getAttendanceById,
    updateAttendance,
    deleteAttendance,
    getAttendanceDashboard,
    getWeeklyAttendance,
    getTodayAttendance,
    getEmployeeAttendance,
    getMonthlyAttendanceSummary
} = require("../services/attendance.service");

const createAttendance = async (req, res) => {

    try {

        const attendance = await recordAttendance(
            req.body,
            req.user
        );

        return res.status(201).json({
            success: true,
            message: "Attendance recorded successfully.",
            data: attendance
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchAttendances = async (req, res) => {

    try {

        const attendances = await getAttendances(req.user);

        return res.status(200).json({
            success: true,
            data: attendances
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchAttendance = async (req, res) => {

    try {

        const attendance = await getAttendanceById(
            req.params.id,
            req.user
        );

        return res.status(200).json({
            success: true,
            data: attendance
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const editAttendance = async (req, res) => {

    try {

        const attendance = await updateAttendance(
            req.params.id,
            req.body,
            req.user
        );

        return res.status(200).json({
            success: true,
            message: "Attendance updated successfully.",
            data: attendance
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const removeAttendance = async (req, res) => {

    try {

        await deleteAttendance(req.params.id, req.user);

        return res.status(200).json({
            success: true,
            message: "Attendance deleted successfully."
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchAttendanceDashboard = async (req, res) => {

    try {

        const dashboard = await getAttendanceDashboard(req.user);

        return res.status(200).json({
            success: true,
            data: dashboard
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchWeeklyAttendance = async (req, res) => {

    try {

        const weeklyAttendance = await getWeeklyAttendance(req.user);

        return res.status(200).json({
            success: true,
            data: weeklyAttendance
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchTodayAttendance = async (req, res) => {

    try {

        const attendance = await getTodayAttendance(req.user);

        return res.status(200).json({
            success: true,
            data: attendance
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchEmployeeAttendance = async (req, res) => {

    try {

        const attendance = await getEmployeeAttendance(
            req.params.employeeId,
            req.user
        );

        return res.status(200).json({
            success: true,
            data: attendance
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

const fetchMonthlyAttendanceSummary = async (req, res) => {

    try {

        const summary = await getMonthlyAttendanceSummary(req.user);

        return res.status(200).json({
            success: true,
            data: summary
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = {
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
};
