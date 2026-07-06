import { useEffect, useState } from "react";
import {
    Users,
    UserCheck,
    UserX,
    Clock3,
    CalendarDays,
    Search,
    Plus,
    RefreshCw
} from "lucide-react";

import {
    getDashboard,
    getAttendances,
    getWeeklyAttendance,
    getTodayAttendance,
    getMonthlySummary
} from "../api/attendanceApi";

import AttendanceTable from "../components/AttendanceTable";
import AttendanceStats from "../components/AttendanceStats";
import AttendanceChart from "../components/AttendanceChart";
import AttendanceSummary from "../components/AttendanceSummary";
import AttendanceModal from "../components/AttendanceModal";

const buildWeeklyChartData = (records = []) => {
    const today = new Date();
    const chartData = [];

    for (let index = 6; index >= 0; index -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - index);
        const dateString = date.toISOString().split("T")[0];
        const dayRecords = (records || []).filter(
            (record) => record.attendance_date === dateString
        );
        const presentCount = dayRecords.filter(
            (record) => record.attendance_status === "PRESENT"
        ).length;

        chartData.push({
            label: date.toLocaleDateString("en", { weekday: "short" }),
            total: presentCount
        });
    }

    return chartData;
};

const buildMonthlySummaryData = (records = []) => {
    const summaryMap = new Map();

    (records || []).forEach((record) => {
        const employeeName = [
            record?.employees?.first_name,
            record?.employees?.last_name
        ]
            .filter(Boolean)
            .join(" ") || "Unknown Employee";

        const employeeCode =
            record?.employees?.employee_code || record?.employee_code || "N/A";

        const key = `${employeeCode}-${employeeName}`;

        if (!summaryMap.has(key)) {
            summaryMap.set(key, {
                employee: employeeName,
                employee_code: employeeCode,
                present: 0,
                absent: 0,
                late: 0,
                leave: 0,
                sick: 0,
                holiday: 0
            });
        }

        const entry = summaryMap.get(key);
        const status = record.attendance_status;

        if (status === "PRESENT") entry.present += 1;
        else if (status === "ABSENT") entry.absent += 1;
        else if (status === "LATE") entry.late += 1;
        else if (status === "LEAVE") entry.leave += 1;
        else if (status === "SICK") entry.sick += 1;
        else if (status === "HOLIDAY") entry.holiday += 1;
    });

    return Array.from(summaryMap.values()).sort((a, b) => b.present - a.present);
};

export default function AttendancePage() {

    const [dashboard, setDashboard] = useState(null);

    const [attendances, setAttendances] = useState([]);

    const [weeklyAttendance, setWeeklyAttendance] = useState([]);

    const [todayAttendance, setTodayAttendance] = useState([]);

    const [monthlySummary, setMonthlySummary] = useState([]);

    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");

    const [statusFilter, setStatusFilter] = useState("All");

    const [showModal, setShowModal] = useState(false);

    const [selectedAttendance, setSelectedAttendance] = useState(null);

    const loadDashboard = async () => {

        try {

            const [
                dashboardRes,
                attendanceRes,
                weeklyRes,
                todayRes,
                monthlyRes
            ] = await Promise.allSettled([

                getDashboard(),

                getAttendances(),

                getWeeklyAttendance(),

                getTodayAttendance(),

                getMonthlySummary()

            ]);

            const dashboardData = dashboardRes.status === "fulfilled"
                ? (dashboardRes.value?.data ?? dashboardRes.value)
                : null;
            const attendanceData = attendanceRes.status === "fulfilled"
                ? (Array.isArray(attendanceRes.value?.data) ? attendanceRes.value.data : Array.isArray(attendanceRes.value?.data?.data) ? attendanceRes.value.data.data : [])
                : [];
            const weeklyData = weeklyRes.status === "fulfilled"
                ? (Array.isArray(weeklyRes.value?.data) ? weeklyRes.value.data : Array.isArray(weeklyRes.value?.data?.data) ? weeklyRes.value.data.data : [])
                : [];
            const todayData = todayRes.status === "fulfilled"
                ? (Array.isArray(todayRes.value?.data) ? todayRes.value.data : Array.isArray(todayRes.value?.data?.data) ? todayRes.value.data.data : [])
                : [];
            const monthlyData = monthlyRes.status === "fulfilled"
                ? (Array.isArray(monthlyRes.value?.data) ? monthlyRes.value.data : Array.isArray(monthlyRes.value?.data?.data) ? monthlyRes.value.data.data : [])
                : [];

            const today = new Date().toISOString().split("T")[0];
            const todaysRecords = attendanceData.filter(
                (record) => record.attendance_date === today
            );
            const normalizedAttendance = Array.isArray(attendanceData) ? attendanceData : [];
            const employeeKeys = new Set(
                normalizedAttendance
                    .map((record) => record?.employee_id ?? record?.employee?.id ?? record?.employees?.id ?? record?.employees?.employee_code ?? record?.employee_code ?? record?.employees?.first_name)
                    .filter(Boolean)
            );
            const presentCount = normalizedAttendance.filter(
                (record) => record.attendance_status === "PRESENT"
            ).length;
            const absentCount = normalizedAttendance.filter(
                (record) => record.attendance_status === "ABSENT"
            ).length;
            const lateCount = normalizedAttendance.filter(
                (record) => record.attendance_status === "LATE"
            ).length;
            const leaveCount = normalizedAttendance.filter(
                (record) => record.attendance_status === "LEAVE"
            ).length;

            const derivedDashboard = {
                totalEmployees: dashboardData?.totalEmployees ?? dashboardData?.data?.totalEmployees ?? employeeKeys.size ?? 0,
                present: presentCount,
                absent: absentCount,
                late: lateCount,
                leave: leaveCount,
                presentToday: dashboardData?.presentToday ?? dashboardData?.data?.presentToday ?? todaysRecords.filter(
                    (record) => record.attendance_status === "PRESENT"
                ).length,
                absentToday: dashboardData?.absentToday ?? dashboardData?.data?.absentToday ?? todaysRecords.filter(
                    (record) => record.attendance_status === "ABSENT"
                ).length,
                lateToday: dashboardData?.lateToday ?? dashboardData?.data?.lateToday ?? todaysRecords.filter(
                    (record) => record.attendance_status === "LATE"
                ).length
            };

            setDashboard(derivedDashboard);

            setAttendances(attendanceData);

            setWeeklyAttendance(buildWeeklyChartData(weeklyData.length ? weeklyData : attendanceData));

            setTodayAttendance(todayData.length ? todayData : todaysRecords);

            setMonthlySummary(buildMonthlySummaryData(monthlyData.length ? monthlyData : attendanceData));

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        loadDashboard();

    }, []);

    const refreshDashboard = () => {

        setLoading(true);

        loadDashboard();

    };

    if (loading) {

        return (

            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white text-lg">

                Loading Attendance...

            </div>

        );

    }

    const filteredAttendance = (attendances || []).filter((attendance) => {

        const employee =
            `${attendance?.employees?.first_name || ""} ${attendance?.employees?.last_name || ""}`.toLowerCase();

        const matchesSearch =
            employee.includes(search.toLowerCase());

        const matchesStatus =
            statusFilter === "All"
                ? true
                : attendance?.attendance_status === statusFilter;

        return matchesSearch && matchesStatus;

    });

    return (

        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">

            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}

                <div className="flex justify-between items-center flex-wrap gap-4">

                    <div>

                        <h1 className="text-4xl font-bold">

                            Attendance Management

                        </h1>

                        <p className="text-slate-400 mt-2">

                            Monitor and manage employee attendance.

                        </p>

                    </div>

                    <div className="flex gap-3">

                        <button

                            onClick={refreshDashboard}

                            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center gap-2"

                        >

                            <RefreshCw size={18} />

                            Refresh

                        </button>

                        <button

                            onClick={() => {

                                setSelectedAttendance(null);

                                setShowModal(true);

                            }}

                            className="px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 flex items-center gap-2"

                        >

                            <Plus size={18} />

                            Record Attendance

                        </button>

                    </div>

                </div>


                          {/* Statistics */}

                <AttendanceStats

                    cards={[

                        {

                            title: "Total Employees",

                            value: dashboard.totalEmployees,

                            icon: Users,

                            color: "blue"

                        },

                        {

                            title: "Present",

                            value: dashboard.present ?? dashboard.presentToday,

                            icon: UserCheck,

                            color: "green"

                        },

                        {

                            title: "Absent",

                            value: dashboard.absent ?? dashboard.absentToday,

                            icon: UserX,

                            color: "red"

                        },

                        {

                            title: "Late",

                            value: dashboard.late ?? dashboard.lateToday,

                            icon: Clock3,

                            color: "yellow"

                        },

                        {

                            title: "Leave",

                            value: dashboard.leave ?? 0,

                            icon: CalendarDays,

                            color: "purple"

                        }

                    ]}

                />



                {/* Weekly Attendance Chart */}

                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">

                    <div className="flex items-center justify-between mb-6">

                        <div>

                            <h2 className="text-xl font-semibold">

                                Weekly Attendance

                            </h2>

                            <p className="text-slate-400 text-sm mt-1">

                                Employee attendance for the last seven days.

                            </p>

                        </div>

                        <CalendarDays
                            size={26}
                            className="text-cyan-400"
                        />

                    </div>

                    <AttendanceChart

                        data={weeklyAttendance}

                    />

                </div>



                {/* Search & Filters */}

                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl">

                    <div className="grid md:grid-cols-3 gap-4">

                        <div className="relative">

                            <Search

                                size={18}

                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"

                            />

                            <input

                                type="text"

                                placeholder="Search employee..."

                                value={search}

                                onChange={(e) =>

                                    setSearch(e.target.value)

                                }

                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-cyan-500 outline-none"

                            />

                        </div>

                        <select

                            value={statusFilter}

                            onChange={(e) =>

                                setStatusFilter(e.target.value)

                            }

                            className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-cyan-500 outline-none"

                        >

                            <option value="All">

                                All Status

                            </option>

                            <option value="PRESENT">

                                Present

                            </option>

                            <option value="ABSENT">

                                Absent

                            </option>

                            <option value="LATE">

                                Late

                            </option>

                            <option value="LEAVE">

                                Leave

                            </option>

                            <option value="SICK">

                                Sick

                            </option>

                            <option value="HOLIDAY">

                                Holiday

                            </option>

                        </select>

                        <div className="flex items-center justify-end text-slate-400">

                            Showing

                            <span className="text-white font-semibold mx-2">

                                {filteredAttendance.length}

                            </span>

                            Records

                        </div>

                    </div>

                </div>


                            {/* Attendance Table */}

                <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">

                    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">

                        <div>

                            <h2 className="text-xl font-semibold">

                                Attendance Records

                            </h2>

                            <p className="text-slate-400 text-sm mt-1">

                                View and manage employee attendance.

                            </p>

                        </div>

                    </div>

                    <AttendanceTable

                        attendances={filteredAttendance}

                        onView={(attendance) => {

                            setSelectedAttendance(attendance);

                            setShowModal(true);

                        }}

                        onEdit={(attendance) => {

                            setSelectedAttendance(attendance);

                            setShowModal(true);

                        }}

                        onDelete={(attendance) => {

                            if (

                                window.confirm(

                                    `Delete attendance for ${attendance.employees.first_name} ${attendance.employees.last_name}?`

                                )

                            ) {

                                console.log(attendance);

                            }

                        }}

                    />

                </div>



                {/* Today's Attendance */}

                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">

                    <div className="flex items-center justify-between mb-6">

                        <div>

                            <h2 className="text-xl font-semibold">

                                Today's Attendance

                            </h2>

                            <p className="text-slate-400 text-sm mt-1">

                                Employees who have checked in today.

                            </p>

                        </div>

                    </div>

                    <div className="overflow-x-auto">

                        <table className="w-full">

                            <thead>

                                <tr className="border-b border-slate-700">

                                    <th className="text-left py-3">

                                        Employee

                                    </th>

                                    <th className="text-left py-3">

                                        Check In

                                    </th>

                                    <th className="text-left py-3">

                                        Check Out

                                    </th>

                                    <th className="text-left py-3">

                                        Hours

                                    </th>

                                    <th className="text-left py-3">

                                        Status

                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {(todayAttendance || []).map((attendance) => (

                                    <tr

                                        key={attendance.attendance_id}

                                        className="border-b border-slate-800 hover:bg-slate-800 transition"

                                    >

                                        <td className="py-4">

                                            <div>

                                                <div className="font-medium">

                                                    {attendance.employees.first_name}{" "}

                                                    {attendance.employees.last_name}

                                                </div>

                                                <div className="text-sm text-slate-400">

                                                    {

                                                        attendance.employees

                                                            .employee_code

                                                    }

                                                </div>

                                            </div>

                                        </td>

                                        <td className="py-4">

                                            {attendance.check_in}

                                        </td>

                                        <td className="py-4">

                                            {attendance.check_out || "--"}

                                        </td>

                                        <td className="py-4">

                                            {attendance.hours_worked || 0}

                                        </td>

                                        <td className="py-4">

                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    attendance.attendance_status ===
                                                    "Present"
                                                        ? "bg-green-500/20 text-green-400"
                                                        : attendance.attendance_status ===
                                                          "Absent"
                                                        ? "bg-red-500/20 text-red-400"
                                                        : attendance.attendance_status ===
                                                          "Late"
                                                        ? "bg-yellow-500/20 text-yellow-400"
                                                        : "bg-blue-500/20 text-blue-400"
                                                }`}
                                            >
                                                {

                                                    attendance.attendance_status

                                                }

                                            </span>

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                </div>
                      {/* Monthly Summary */}

                <div className="grid lg:grid-cols-2 gap-6">

                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">

                        <h2 className="text-xl font-semibold mb-2">

                            Monthly Attendance Summary

                        </h2>

                        <p className="text-slate-400 text-sm mb-6">

                            Overall attendance performance this month.

                        </p>

                        <AttendanceSummary

                            summary={monthlySummary}

                        />

                    </div>

                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">

                        <h2 className="text-xl font-semibold mb-4">

                            Attendance Overview

                        </h2>

                        <div className="space-y-4">

                            <div className="flex justify-between items-center">

                                <span className="text-slate-400">

                                    Total Employees

                                </span>

                                <span className="font-bold text-xl">

                                    {dashboard.totalEmployees}

                                </span>

                            </div>

                            <div className="flex justify-between items-center">

                                <span className="text-slate-400">

                                    Present

                                </span>

                                <span className="text-green-400 font-semibold">

                                    {dashboard.presentToday}

                                </span>

                            </div>

                            <div className="flex justify-between items-center">

                                <span className="text-slate-400">

                                    Absent

                                </span>

                                <span className="text-red-400 font-semibold">

                                    {dashboard.absentToday}

                                </span>

                            </div>

                            <div className="flex justify-between items-center">

                                <span className="text-slate-400">

                                    Late

                                </span>

                                <span className="text-yellow-400 font-semibold">

                                    {dashboard.late ?? dashboard.lateToday}

                                </span>

                            </div>

                            <div className="flex justify-between items-center">

                                <span className="text-slate-400">

                                    Leave

                                </span>

                                <span className="text-purple-400 font-semibold">

                                    {dashboard.leave ?? 0}

                                </span>

                            </div>

                            <div className="border-t border-slate-700 pt-4 flex justify-between items-center">

                                <span className="font-semibold">

                                    Attendance Rate

                                </span>

                                <span className="text-cyan-400 text-2xl font-bold">

                                    {

                                        dashboard.totalEmployees === 0

                                            ? "0%"

                                            : `${Math.round(

                                                  dashboard.presentToday *

                                                      100 /

                                                      dashboard.totalEmployees

                                              )}%`

                                    }

                                </span>

                            </div>

                        </div>

                    </div>

                </div>



                {/* Record / Edit Attendance */}

                <AttendanceModal

                    open={showModal}

                    attendance={selectedAttendance}

                    onClose={() => {

                        setShowModal(false);

                        setSelectedAttendance(null);

                    }}

                    onSuccess={() => {

                        setShowModal(false);

                        setSelectedAttendance(null);

                        refreshDashboard();

                    }}

                />

            </div>

        </div>

    );

}          
