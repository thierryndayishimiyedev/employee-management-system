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
const { isSuperAdmin, requireCompanyIds, scopeByCompany } = require("../utils/companyScope");
const { scopeByManager, assertEmployeeManager } = require("../utils/managerScope");

const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;
    const parse = (value) => {
        const [hours, minutes = "0"] = String(value).split(":");
        const total = Number(hours) * 60 + Number(minutes);
        return Number.isFinite(total) ? total : NaN;
    };
    const start = parse(checkIn);
    const end = parse(checkOut);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        throw new Error("Check-out must be later than check-in.");
    }
    return Number(((end - start) / 60).toFixed(2));
};

// The live attendance_status enum currently supports PRESENT, ABSENT and LEAVE.
// Do not send UI-only values such as LATE/SICK/HOLIDAY to Supabase.
const VALID_ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LEAVE"];
const isWorkedStatus = (status) => status === "PRESENT";

const buildAttendanceValues = (attendanceData, { allowOpenCheckIn = false } = {}) => {
    const { check_in, check_out, overtime_hours, attendance_status } = attendanceData;
    if (!VALID_ATTENDANCE_STATUSES.includes(attendance_status)) {
        throw new Error("Attendance status must be PRESENT, ABSENT, or LEAVE.");
    }
    if (isWorkedStatus(attendance_status) && !check_in) {
        throw new Error("Check-in is required for worked attendance.");
    }
    if (isWorkedStatus(attendance_status) && !check_out && !allowOpenCheckIn) {
        throw new Error("Use the check-out action after the worker finishes work.");
    }
    const hours_worked = isWorkedStatus(attendance_status) && check_out
        ? calculateHours(check_in, check_out)
        : 0;
    const overtime = overtime_hours === "" || overtime_hours === null || overtime_hours === undefined
        ? Math.max(0, Number(hours_worked) - 8)
        : Number(overtime_hours);
    if (!Number.isFinite(overtime) || overtime < 0) throw new Error("Overtime hours cannot be negative.");
    return { hours_worked, overtime_hours: overtime };
};

const recordAttendance = async (attendanceData, user) => {

    const {
        employee_id,
        attendance_date,
        check_in,
        check_out,
        overtime_hours,
        attendance_status,
        remarks
    } = attendanceData;

    if (!attendance_date || Number.isNaN(Date.parse(`${attendance_date}T00:00:00Z`))) {
        throw new Error("A valid attendance date is required.");
    }
    // Operations run Monday through Saturday. Sunday is a rest day and must
    // never enter the payroll attendance ledger.
    if (new Date(`${attendance_date}T00:00:00Z`).getUTCDay() === 0) {
        throw new Error("Attendance cannot be recorded on Sunday. Sunday is a non-working day.");
    }

    let employeeQuery = supabase
        .from("employees")
        .select("company_id, manager_user_id")
        .eq("employee_id", employee_id);

    if (!isSuperAdmin(user)) {
        employeeQuery = employeeQuery.in("company_id", requireCompanyIds(user));
    }

    const { data: employee, error: employeeError } = await employeeQuery.single();

    if (employeeError || !employee)
        throw new Error("Employee not found.");
    assertEmployeeManager(employee, user);
    if (!employee.manager_user_id) throw new Error("Employee is not assigned to a manager.");

    let existingQuery = scopeByCompany(supabase
        .from("attendance")
        .select("attendance_id")
        .eq("employee_id", employee_id)
        .eq("attendance_date", attendance_date), user);
    existingQuery = scopeByManager(existingQuery, user);
    const { data: existing } = await existingQuery.maybeSingle();

    if (existing)
        throw new Error("Attendance already recorded for this employee.");

    // Standard attendance is saved as a completed shift by the daily register
    // (07:00–17:00). An accountant can use the manual exception form to enter
    // a genuine early departure or another non-standard time.
    const calculated = buildAttendanceValues({ check_in, check_out, overtime_hours, attendance_status }, { allowOpenCheckIn: true });

    const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .insert([{
            employee_id,
            company_id: employee.company_id,
            manager_user_id: employee.manager_user_id,
            attendance_date,
            check_in,
            check_out,
            ...calculated,
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

const checkOutAttendance = async (id, attendanceData, user) => {
    const existing = await getAttendanceById(id, user);
    if (existing.attendance_status !== "PRESENT") {
        throw new Error("Only a present worker can be checked out.");
    }
    if (!existing.check_in) throw new Error("This attendance record has no check-in time.");
    if (existing.check_out) throw new Error("This worker has already been checked out and cannot be checked out twice.");
    if (!attendanceData?.check_out) throw new Error("A check-out time is required.");

    const calculated = buildAttendanceValues({
        check_in: existing.check_in,
        check_out: attendanceData.check_out,
        overtime_hours: attendanceData.overtime_hours,
        attendance_status: "PRESENT"
    });
    let query = scopeByCompany(supabase
        .from("attendance")
        .update({
            check_out: attendanceData.check_out,
            hours_worked: calculated.hours_worked,
            overtime_hours: calculated.overtime_hours,
            remarks: attendanceData.remarks ?? existing.remarks
        })
        .eq("attendance_id", id)
        .is("check_out", null)
        .select(), user);
    query = scopeByManager(query, user);
    const { data, error } = await query.single();
    if (error) throw error;
    return data;
};

const getAttendances = async (user) => {

    let query = scopeByCompany(supabase
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
        }), user);
    query = scopeByManager(query, user);

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getAttendanceById = async (id, user) => {

    let query = scopeByCompany(supabase
        .from("attendance")
        .select(`
            *,
            employees(
                employee_code,
                first_name,
                last_name
            )
        `)
        .eq("attendance_id", id), user);
    query = scopeByManager(query, user);

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

const updateAttendance = async (id, attendanceData, user) => {
    const existing = await getAttendanceById(id, user);
    if (existing.attendance_status === "PRESENT" && existing.check_out) {
        throw new Error("Completed attendance cannot be edited. Use the approved correction process if a correction is required.");
    }
    if (attendanceData.check_out) {
        throw new Error("Use the dedicated check-out action to complete attendance.");
    }
    const safeData = {
        attendance_date: attendanceData.attendance_date ?? existing.attendance_date,
        check_in: attendanceData.check_in ?? existing.check_in,
        check_out: attendanceData.check_out ?? existing.check_out,
        attendance_status: attendanceData.attendance_status ?? existing.attendance_status,
        overtime_hours: attendanceData.overtime_hours,
        remarks: attendanceData.remarks
    };
    if (!safeData.attendance_date || Number.isNaN(Date.parse(safeData.attendance_date))) {
        throw new Error("A valid attendance date is required.");
    }
    const calculated = buildAttendanceValues(safeData, { allowOpenCheckIn: true });
    let query = scopeByCompany(supabase
        .from("attendance")
        .update({
            attendance_date: safeData.attendance_date,
            check_in: safeData.check_in,
            check_out: safeData.check_out,
            attendance_status: safeData.attendance_status,
            overtime_hours: calculated.overtime_hours,
            hours_worked: calculated.hours_worked,
            remarks: safeData.remarks ?? existing.remarks
        })
        .eq("attendance_id", id)
        .select(), user);
    query = scopeByManager(query, user);

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

const deleteAttendance = async (id, user) => {

    let query = scopeByCompany(supabase
        .from("attendance")
        .delete()
        .eq("attendance_id", id), user);
    query = scopeByManager(query, user);

    const { error } = await query;

    if (error)
        throw error;

    return {
        message: "Attendance deleted successfully."
    };

};

const getAttendanceDashboard = async (user) => {

    const today = new Date().toISOString().split("T")[0];

    let employeeCountQuery = scopeByCompany(supabase
        .from("employees")
        .select("*", {
            count: "exact",
            head: true
        }), user);
    employeeCountQuery = scopeByManager(employeeCountQuery, user);
    const { count: totalEmployees, error: employeeCountError } = await employeeCountQuery;
    if (employeeCountError) throw employeeCountError;

    let todayQuery = scopeByCompany(supabase
        .from("attendance")
        .select("attendance_status,hours_worked,overtime_hours")
        .eq("attendance_date", today), user);
    todayQuery = scopeByManager(todayQuery, user);
    const { data: todayRecords, error: todayError } = await todayQuery;
    if (todayError) throw todayError;
    const records = todayRecords || [];
    const presentToday = records.filter((record) => record.attendance_status === "PRESENT").length;
    const absentToday = records.filter((record) => record.attendance_status === "ABSENT").length;

    return {
        totalEmployees,
        presentToday,
        absentToday,
        // LATE is not an available value in the current live enum. Keep the
        // response shape stable without querying it as a supported workflow.
        lateToday: 0,
        totalHours: records.reduce((sum, record) => sum + Number(record.hours_worked || 0), 0),
        overtimeHours: records.reduce((sum, record) => sum + Number(record.overtime_hours || 0), 0),
        attendancePercentage: totalEmployees ? Number(((presentToday / totalEmployees) * 100).toFixed(2)) : 0
    };

};

const getWeeklyAttendance = async (user) => {
    const today = new Date();
    const day = today.getDay();
    const daysSinceMonday = (day + 6) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - daysSinceMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const toDate = (value) => value.toISOString().slice(0, 10);
    let query = scopeByCompany(supabase
        .from("attendance")
        .select(`
            attendance_date,
            attendance_status,
            hours_worked,
            overtime_hours
        `)
        .gte("attendance_date", toDate(start))
        .lte("attendance_date", toDate(end)), user);
    query = scopeByManager(query, user);

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getTodayAttendance = async (user) => {

    const today = new Date().toISOString().split("T")[0];

    let query = scopeByCompany(supabase
        .from("attendance")
        .select(`
            *,
            employees(
                employee_code,
                first_name,
                last_name
            )
        `)
        .eq("attendance_date", today), user);
    query = scopeByManager(query, user);

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getEmployeeAttendance = async (employeeId, user) => {

    let query = scopeByCompany(supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .order("attendance_date", {
            ascending: false
        }), user);
    query = scopeByManager(query, user);

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getMonthlyAttendanceSummary = async (user) => {

    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    let query = scopeByCompany(supabase
        .from("attendance")
        .select(`
            attendance_status,
            attendance_date,
            company_id
        `), user);
    query = scopeByManager(query, user);

    const { data, error } = await query;

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
    checkOutAttendance,
    deleteAttendance,
    getAttendanceDashboard,
    getWeeklyAttendance,
    getTodayAttendance,
    getEmployeeAttendance,
    getMonthlyAttendanceSummary
};
