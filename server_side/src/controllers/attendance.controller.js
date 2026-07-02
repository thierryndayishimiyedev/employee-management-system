const {
    recordAttendance,
    getAttendances,
    getAttendanceById,
    updateAttendance,
    deleteAttendance
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

        const attendances = await getAttendances();

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
            req.params.id
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
            req.body
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

        await deleteAttendance(req.params.id);

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

module.exports = {
    createAttendance,
    fetchAttendances,
    fetchAttendance,
    editAttendance,
    removeAttendance
};