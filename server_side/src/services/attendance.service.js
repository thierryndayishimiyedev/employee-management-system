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
            employees(first_name,last_name,employee_code)
        `)
        .order("attendance_date", { ascending: false });

    if (error)
        throw error;

    return data;

};

const getAttendanceById = async (id) => {

    const { data, error } = await supabase
        .from("attendance")
        .select(`
            *,
            employees(first_name,last_name,employee_code)
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

    return true;

};

module.exports = {
    recordAttendance,
    getAttendances,
    getAttendanceById,
    updateAttendance,
    deleteAttendance
};