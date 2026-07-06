import api from "./api";

/*
|--------------------------------------------------------------------------
| Get All Attendance Records
|--------------------------------------------------------------------------
*/

export const getAttendances = async () => {

    const response = await api.get("/attendance");

    return response.data;

};

/*
|--------------------------------------------------------------------------
| Get Attendance By ID
|--------------------------------------------------------------------------
*/

export const getAttendanceById = async (id) => {

    const response = await api.get(

        `/attendance/${id}`

    );

    return response.data;

};

/*
|--------------------------------------------------------------------------
| Record Attendance
|--------------------------------------------------------------------------
*/

export const createAttendance = async (attendanceData) => {

    const response = await api.post(

        "/attendance",

        attendanceData

    );

    return response.data;

};

/*
|--------------------------------------------------------------------------
| Update Attendance
|--------------------------------------------------------------------------
*/

export const updateAttendance = async (

    id,

    attendanceData

) => {

    const response = await api.put(

        `/attendance/${id}`,

        attendanceData

    );

    return response.data;

};

/*
|--------------------------------------------------------------------------
| Delete Attendance
|--------------------------------------------------------------------------
*/

export const deleteAttendance = async (id) => {

    const response = await api.delete(

        `/attendance/${id}`

    );

    return response.data;

};

/*
|--------------------------------------------------------------------------
| Attendance Dashboard
|--------------------------------------------------------------------------
*/

export const getAttendanceDashboard = async () => {

    const response = await api.get(

        "/attendance/dashboard"

    );

    return response.data;

};

/*
|--------------------------------------------------------------------------
| Today's Attendance
|--------------------------------------------------------------------------
*/

export const getTodayAttendance = async () => {

    const response = await api.get(

        "/attendance/today"

    );

    return response.data;

};

/*
|--------------------------------------------------------------------------
| Monthly Attendance Summary
|--------------------------------------------------------------------------
*/

export const getMonthlyAttendance = async () => {

    const response = await api.get(

        "/attendance/monthly-summary"

    );

    return response.data;

};

/*
|--------------------------------------------------------------------------
| Weekly Attendance Chart
|--------------------------------------------------------------------------
*/

export const getWeeklyAttendance = async () => {

    const response = await api.get(

        "/attendance/weekly"

    );

    return response.data;

};

export const getDashboard = getAttendanceDashboard;
export const getMonthlySummary = getMonthlyAttendance;