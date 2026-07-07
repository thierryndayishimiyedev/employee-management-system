import {
    Eye,
    Pencil,
    Trash2
} from "lucide-react";

export default function AttendanceTable({

    attendances,

    onView,

    onEdit,

    onDelete,

    canManage = true

}) {

    const safeAttendances = Array.isArray(attendances) ? attendances : [];

    if (!safeAttendances.length) {

        return (

            <div className="py-20 text-center">

                <h3 className="text-xl font-semibold text-slate-800">

                    No Attendance Records

                </h3>

                <p className="mt-2 text-slate-500">

                    No employee attendance has been recorded yet.

                </p>

            </div>

        );

    }

    return (

        <div className="overflow-x-auto">

            <table className="w-full">

                <thead>

                    <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">

                        <th className="px-5 py-4 text-left font-semibold">

                            Employee

                        </th>

                        <th className="px-5 py-4 text-left font-semibold">

                            Date

                        </th>

                        <th className="px-5 py-4 text-left font-semibold">

                            Check In

                        </th>

                        <th className="px-5 py-4 text-left font-semibold">

                            Check Out

                        </th>

                        <th className="px-5 py-4 text-left font-semibold">

                            Hours

                        </th>

                        <th className="px-5 py-4 text-left font-semibold">

                            Overtime

                        </th>

                        <th className="px-5 py-4 text-left font-semibold">

                            Status

                        </th>

                        <th className="px-5 py-4 text-center font-semibold">

                            Actions

                        </th>

                    </tr>

                </thead>

                <tbody>

                    {safeAttendances.map((attendance) => (

                        <tr

                            key={attendance.attendance_id}

                            className="border-b border-slate-100 transition hover:bg-slate-50/70"

                        >

                            <td className="py-4 px-5">

                                <div>

                                    <div className="font-semibold text-slate-800">

                                        {attendance.employees.first_name}{" "}

                                        {attendance.employees.last_name}

                                    </div>

                                    <div className="mt-1 text-xs text-slate-500">

                                        {

                                            attendance.employees.employee_code

                                        }

                                    </div>

                                </div>

                            </td>

                            <td className="px-5 py-4 text-slate-600">

                                {attendance.attendance_date}

                            </td>

                            <td className="px-5 py-4 text-slate-600">

                                {attendance.check_in || "--"}

                            </td>

                            <td className="px-5 py-4 text-slate-600">

                                {attendance.check_out || "--"}

                            </td>

                            <td className="px-5 py-4 text-slate-600">

                                {attendance.hours_worked || 0} hrs

                            </td>

                            <td className="px-5 py-4 text-slate-600">

                                {attendance.overtime_hours || 0} hrs

                            </td>

                            <td className="py-4 px-5">

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
                                            : attendance.attendance_status ===
                                              "LEAVE"
                                            ? "bg-cyan-50 text-cyan-700 ring-cyan-100"
                                            : attendance.attendance_status ===
                                              "SICK"
                                            ? "bg-slate-100 text-slate-700 ring-slate-200"
                                            : attendance.attendance_status ===
                                              "HOLIDAY"
                                            ? "bg-cyan-50 text-cyan-700 ring-cyan-100"
                                            : "bg-slate-100 text-slate-700 ring-slate-200"
                                    }`}
                                >
                                    {

                                        attendance.attendance_status

                                    }
                                </span>

                            </td>

                            <td className="py-4 px-5">

                                <div className="flex justify-center gap-2">

                                    <button

                                        onClick={() =>
                                            onView(attendance)
                                        }

                                        className="rounded-md p-2 text-slate-400 transition hover:bg-cyan-50 hover:text-cyan-700"

                                    >

                                        <Eye size={18} />

                                    </button>

                                    {canManage && (
                                        <>
                                            <button

                                                onClick={() =>
                                                    onEdit(attendance)
                                                }

                                                className="rounded-md p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"

                                            >

                                                <Pencil size={18} />

                                            </button>

                                            <button

                                                onClick={() =>
                                                    onDelete(attendance)
                                                }

                                                className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"

                                            >

                                                <Trash2 size={18} />

                                            </button>
                                        </>
                                    )}

                                </div>

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    );

}
