// const supabase = require("../config/supabase");

// const recordAttendance = async (attendanceData, user) => {

//     const {
//         employee_id,
//         attendance_date,
//         check_in,
//         check_out,
//         hours_worked,
//         overtime_hours,
//         attendance_status,
//         remarks
//     } = attendanceData;

//     const { data: employee, error: employeeError } = await supabase
//         .from("employees")
//         .select("company_id")
//         .eq("employee_id", employee_id)
//         .single();

//     if (employeeError || !employee)
//         throw new Error("Employee not found.");

//     const { data: existing } = await supabase
//         .from("attendance")
//         .select("attendance_id")
//         .eq("employee_id", employee_id)
//         .eq("attendance_date", attendance_date)
//         .maybeSingle();

//     if (existing)
//         throw new Error("Attendance already recorded for this employee.");

//     const { data: attendance, error: attendanceError } = await supabase
//         .from("attendance")
//         .insert([{
//             employee_id,
//             company_id: employee.company_id,
//             attendance_date,
//             check_in,
//             check_out,
//             hours_worked,
//             overtime_hours,
//             attendance_status,
//             remarks,
//             recorded_by: user.user_id
//         }])
//         .select()
//         .single();

//     if (attendanceError)
//         throw attendanceError;

//     return attendance;

// };

// const getAttendances = async () => {

//     const { data, error } = await supabase
//         .from("attendance")
//         .select(`
//             *,
//             employees(
//                 employee_code,
//                 first_name,
//                 last_name
//             )
//         `)
//         .order("attendance_date", {
//             ascending: false
//         });

//     if (error)
//         throw error;

//     return data;

// };

// const getAttendanceById = async (id) => {

//     const { data, error } = await supabase
//         .from("attendance")
//         .select(`
//             *,
//             employees(
//                 employee_code,
//                 first_name,
//                 last_name
//             )
//         `)
//         .eq("attendance_id", id)
//         .single();

//     if (error)
//         throw error;

//     return data;

// };

// const updateAttendance = async (id, attendanceData) => {

//     const { data, error } = await supabase
//         .from("attendance")
//         .update(attendanceData)
//         .eq("attendance_id", id)
//         .select()
//         .single();

//     if (error)
//         throw error;

//     return data;

// };

// const deleteAttendance = async (id) => {

//     const { error } = await supabase
//         .from("attendance")
//         .delete()
//         .eq("attendance_id", id);

//     if (error)
//         throw error;

//     return {
//         message: "Attendance deleted successfully."
//     };

// };

// module.exports = {
//     recordAttendance,
//     getAttendances,
//     getAttendanceById,
//     updateAttendance,
//     deleteAttendance
// };

const supabase = require("../config/supabase");

const recordAttendance = async (attendanceData, user) => {

    const {
        employee_id,
        attendance_date,
        check_in,
        check_out,
        hours_worked,
        overtime_hours,
        attendance_status,
        remarks
    } = attendanceData;

    const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("company_id")
        .eq("employee_id", employee_id)
        .single();

    if (employeeError || !employee)
        throw new Error("Employee not found.");

    const { data: existing } = await supabase
        .from("attendance")
        .select("attendance_id")
        .eq("employee_id", employee_id)
        .eq("attendance_date", attendance_date)
        .maybeSingle();

    if (existing)
        throw new Error("Attendance already recorded for this employee.");

    const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .insert([{
            employee_id,
            company_id: employee.company_id,
            attendance_date,
            check_in,
            check_out,
            hours_worked,
            overtime_hours,
            attendance_status,
            remarks,
            recorded_by: user.user_id
        }])
        .select()
        .single();

    if (attendanceError)
        throw attendanceError;

    return attendance;

};

const getAttendances = async () => {

    const { data, error } = await supabase
        .from("attendance")
        .select(`
            *,
            employees(
                employee_code,
                first_name,
                last_name
            )
        `)
        .order("attendance_date", {
            ascending: false
        });

    if (error)
        throw error;

    return data;

};

const getAttendanceById = async (id) => {

    const { data, error } = await supabase
        .from("attendance")
        .select(`
            *,
            employees(
                employee_code,
                first_name,
                last_name
            )
        `)
        .eq("attendance_id", id)
        .single();

    if (error)
        throw error;

    return data;

};

const updateAttendance = async (id, attendanceData) => {

    const { data, error } = await supabase
        .from("attendance")
        .update(attendanceData)
        .eq("attendance_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const deleteAttendance = async (id) => {

    const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("attendance_id", id);

    if (error)
        throw error;

    return {
        message: "Attendance deleted successfully."
    };

};

const getAttendanceDashboard = async () => {

    const today = new Date().toISOString().split("T")[0];

    const { count: totalEmployees } = await supabase
        .from("employees")
        .select("*", {
            count: "exact",
            head: true
        });

    const { count: presentToday } = await supabase
        .from("attendance")
        .select("*", {
            count: "exact",
            head: true
        })
        .eq("attendance_date", today)
        .eq("attendance_status", "PRESENT");

    const { count: absentToday } = await supabase
        .from("attendance")
        .select("*", {
            count: "exact",
            head: true
        })
        .eq("attendance_date", today)
        .eq("attendance_status", "ABSENT");

    const { count: lateToday } = await supabase
        .from("attendance")
        .select("*", {
            count: "exact",
            head: true
        })
        .eq("attendance_date", today)
        .eq("attendance_status", "LATE");

    return {
        totalEmployees,
        presentToday,
        absentToday,
        lateToday
    };

};

const getWeeklyAttendance = async () => {

    const { data, error } = await supabase
        .from("attendance")
        .select(`
            attendance_date,
            attendance_status
        `);

    if (error)
        throw error;

    return data;

};

const getTodayAttendance = async () => {

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
        .from("attendance")
        .select(`
            *,
            employees(
                employee_code,
                first_name,
                last_name
            )
        `)
        .eq("attendance_date", today);

    if (error)
        throw error;

    return data;

};

const getEmployeeAttendance = async (employeeId) => {

    const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .order("attendance_date", {
            ascending: false
        });

    if (error)
        throw error;

    return data;

};

const getMonthlyAttendanceSummary = async () => {

    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    const { data, error } = await supabase
        .from("attendance")
        .select(`
            attendance_status,
            attendance_date
        `);

    if (error)
        throw error;

    return data.filter(record => {

        const date = new Date(record.attendance_date);

        return (
            date.getMonth() + 1 === month &&
            date.getFullYear() === year
        );

    });

};

module.exports = {
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
};