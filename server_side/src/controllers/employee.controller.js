const { getEmployeesForAttendance } = require("../services/employee.service");

const fetchEmployeesForAttendance = async (req, res) => {
    try {
        const employees = await getEmployeesForAttendance(req.user);

        return res.status(200).json({
            success: true,
            data: employees
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    fetchEmployeesForAttendance
};
