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
    getMonthlySummary,
    deleteAttendance
} from "../api/attendanceApi";

import AttendanceTable from "../components/AttendanceTable";
import AttendanceStats from "../components/AttendanceStats";
import AttendanceChart from "../components/AttendanceChart";
import AttendanceSummary from "../components/AttendanceSummary";
import AttendanceModal from "../components/AttendanceModal";
import { useAuth } from "../context/authStore";
import AppSidebar from "./Appsidebar";

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

    const { user } = useAuth();

    const canManageAttendance = user?.role_name === "ACCOUNTANT";

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

            <div className="flex min-h-screen items-center justify-center bg-slate-50 text-lg text-slate-600">

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

        <div className="flex min-h-screen bg-slate-50">

            <AppSidebar />

            <main className="flex-1 p-4 md:p-8 text-slate-900">

            <div className="mx-auto max-w-7xl space-y-6">

                {/* Header */}

                <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

                <div className="flex flex-wrap items-end justify-between gap-4">

                    <div>

                        <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-100">

                            Attendance

                        </p>

                        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">

                            Attendance Management

                        </h1>

                        <p className="mt-2 max-w-2xl text-slate-500">

                            {canManageAttendance ? "Record daily attendance and review attendance history." : "View company attendance records and today's attendance status."}

                        </p>

                    </div>

                    <div className="flex gap-3">

                        <button

                            onClick={refreshDashboard}

                            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"

                        >

                            <RefreshCw size={18} />

                            Refresh

                        </button>

                        {canManageAttendance && (
                        <button

                            onClick={() => {

                                setSelectedAttendance(null);

                                setShowModal(true);

                            }}

                            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"

                        >

                            <Plus size={18} />

                            Record Attendance

                        </button>
                        )}

                    </div>

                </div>

                </header>


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

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div className="flex items-center justify-between mb-6">

                        <div>

                            <h2 className="text-xl font-semibold">

                                Weekly Attendance

                            </h2>

                            <p className="mt-1 text-sm text-slate-500">

                                Employee attendance for the last seven days.

                            </p>

                        </div>

                        <CalendarDays
                            size={26}
                            className="text-amber-600"
                        />

                    </div>

                    <AttendanceChart

                        data={weeklyAttendance}

                    />

                </div>



                {/* Search & Filters */}

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

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

                                className="w-full rounded-md border border-slate-200 px-4 py-3 pl-11 text-sm outline-none transition focus:border-amber-400"

                            />

                        </div>

                        <select

                            value={statusFilter}

                            onChange={(e) =>

                                setStatusFilter(e.target.value)

                            }

                            className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400"

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

                        <div className="flex items-center justify-end text-sm text-slate-500">

                            Showing

                            <span className="mx-2 font-semibold text-slate-900">

                                {filteredAttendance.length}

                            </span>

                            Records

                        </div>

                    </div>

                </div>


                            {/* Attendance Table */}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

                        <div>

                            <h2 className="text-xl font-semibold">

                                Attendance Records

                            </h2>

                            <p className="mt-1 text-sm text-slate-500">

                                View and manage employee attendance.

                            </p>

                        </div>

                    </div>

                    <AttendanceTable

                        attendances={filteredAttendance}
                        canManage={canManageAttendance}

                        onView={(attendance) => {

                            setSelectedAttendance(attendance);

                            setShowModal(true);

                        }}

                        onEdit={(attendance) => {

                            if (!canManageAttendance) return;

                            setSelectedAttendance(attendance);

                            setShowModal(true);

                        }}

                        onDelete={(attendance) => {

                            if (!canManageAttendance) return;

                            if (

                                window.confirm(

                                    `Delete attendance for ${attendance.employees.first_name} ${attendance.employees.last_name}?`

                                )

                            ) {

                                deleteAttendance(attendance.attendance_id)
                                    .then(refreshDashboard)
                                    .catch((error) => {
                                        alert(error.response?.data?.message || "Failed to delete attendance");
                                    });

                            }

                        }}

                    />

                </div>



                {/* Today's Attendance */}

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                    <div className="flex items-center justify-between mb-6">

                        <div>

                            <h2 className="text-xl font-semibold">

                                Today's Attendance

                            </h2>

                            <p className="mt-1 text-sm text-slate-500">

                                Employees who have checked in today.

                            </p>

                        </div>

                    </div>

                    <div className="overflow-x-auto">

                        <table className="w-full text-sm">

                            <thead>

                                <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">

                                    <th className="px-4 py-3 text-left font-semibold">

                                        Employee

                                    </th>

                                    <th className="px-4 py-3 text-left font-semibold">

                                        Check In

                                    </th>

                                    <th className="px-4 py-3 text-left font-semibold">

                                        Check Out

                                    </th>

                                    <th className="px-4 py-3 text-left font-semibold">

                                        Hours

                                    </th>

                                    <th className="px-4 py-3 text-left font-semibold">

                                        Status

                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {(todayAttendance || []).map((attendance) => (

                                    <tr

                                        key={attendance.attendance_id}

                                        className="border-b border-slate-100 transition hover:bg-slate-50/70"

                                    >

                                        <td className="px-4 py-4">

                                            <div>

                                                <div className="font-medium text-slate-800">

                                                    {attendance.employees.first_name}{" "}

                                                    {attendance.employees.last_name}

                                                </div>

                                                <div className="text-sm text-slate-500">

                                                    {

                                                        attendance.employees

                                                            .employee_code

                                                    }

                                                </div>

                                            </div>

                                        </td>

                                        <td className="px-4 py-4 text-slate-600">

                                            {attendance.check_in}

                                        </td>

                                        <td className="px-4 py-4 text-slate-600">

                                            {attendance.check_out || "--"}

                                        </td>

                                        <td className="px-4 py-4 text-slate-600">

                                            {attendance.hours_worked || 0}

                                        </td>

                                        <td className="px-4 py-4">

                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                                                    attendance.attendance_status ===
                                                    "PRESENT"
                                                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                                        : attendance.attendance_status ===
                                                          "ABSENT"
                                                        ? "bg-red-50 text-red-700 ring-red-100"
                                                        : attendance.attendance_status ===
                                                          "LATE"
                                                        ? "bg-amber-50 text-amber-700 ring-amber-100"
                                                        : "bg-cyan-50 text-cyan-700 ring-cyan-100"
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

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                        <h2 className="text-xl font-semibold mb-2">

                            Monthly Attendance Summary

                        </h2>

                        <p className="mb-6 text-sm text-slate-500">

                            Overall attendance performance this month.

                        </p>

                        <AttendanceSummary

                            summary={monthlySummary}

                        />

                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                        <h2 className="text-xl font-semibold mb-4">

                            Attendance Overview

                        </h2>

                        <div className="space-y-4">

                            <div className="flex justify-between items-center">

                                <span className="text-slate-500">

                                    Total Employees

                                </span>

                                <span className="text-xl font-bold text-slate-900">

                                    {dashboard.totalEmployees}

                                </span>

                            </div>

                            <div className="flex justify-between items-center">

                                <span className="text-slate-500">

                                    Present

                                </span>

                                <span className="font-semibold text-emerald-600">

                                    {dashboard.presentToday}

                                </span>

                            </div>

                            <div className="flex justify-between items-center">

                                <span className="text-slate-500">

                                    Absent

                                </span>

                                <span className="font-semibold text-red-600">

                                    {dashboard.absentToday}

                                </span>

                            </div>

                            <div className="flex justify-between items-center">

                                <span className="text-slate-500">

                                    Late

                                </span>

                                <span className="font-semibold text-amber-600">

                                    {dashboard.late ?? dashboard.lateToday}

                                </span>

                            </div>

                            <div className="flex justify-between items-center">

                                <span className="text-slate-500">

                                    Leave

                                </span>

                                <span className="font-semibold text-slate-600">

                                    {dashboard.leave ?? 0}

                                </span>

                            </div>

                            <div className="flex items-center justify-between border-t border-slate-200 pt-4">

                                <span className="font-semibold">

                                    Attendance Rate

                                </span>

                                <span className="text-2xl font-bold text-amber-600">

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

                {canManageAttendance && (
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
                )}

            </div>

            </main>

        </div>

    );

}          
