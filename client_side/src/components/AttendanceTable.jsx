import {
    Eye,
    Pencil,
    Trash2
} from "lucide-react";

export default function AttendanceTable({

    attendances,

    onView,

    onEdit,

    onDelete

}) {

    const safeAttendances = Array.isArray(attendances) ? attendances : [];

    if (!safeAttendances.length) {

        return (

            <div className="py-20 text-center">

                <h3 className="text-xl font-semibold text-slate-300">

                    No Attendance Records

                </h3>

                <p className="text-slate-500 mt-2">

                    No employee attendance has been recorded yet.

                </p>

            </div>

        );

    }

    return (

        <div className="overflow-x-auto">

            <table className="w-full">

                <thead>

                    <tr className="border-b border-slate-700 bg-slate-800">

                        <th className="text-left py-4 px-5">

                            Employee

                        </th>

                        <th className="text-left py-4 px-5">

                            Date

                        </th>

                        <th className="text-left py-4 px-5">

                            Check In

                        </th>

                        <th className="text-left py-4 px-5">

                            Check Out

                        </th>

                        <th className="text-left py-4 px-5">

                            Hours

                        </th>

                        <th className="text-left py-4 px-5">

                            Overtime

                        </th>

                        <th className="text-left py-4 px-5">

                            Status

                        </th>

                        <th className="text-center py-4 px-5">

                            Actions

                        </th>

                    </tr>

                </thead>

                <tbody>

                    {safeAttendances.map((attendance) => (

                        <tr

                            key={attendance.attendance_id}

                            className="border-b border-slate-800 hover:bg-slate-800/50 transition"

                        >

                            <td className="py-4 px-5">

                                <div>

                                    <div className="font-semibold">

                                        {attendance.employees.first_name}{" "}

                                        {attendance.employees.last_name}

                                    </div>

                                    <div className="text-xs text-slate-400 mt-1">

                                        {

                                            attendance.employees.employee_code

                                        }

                                    </div>

                                </div>

                            </td>

                            <td className="py-4 px-5">

                                {attendance.attendance_date}

                            </td>

                            <td className="py-4 px-5">

                                {attendance.check_in || "--"}

                            </td>

                            <td className="py-4 px-5">

                                {attendance.check_out || "--"}

                            </td>

                            <td className="py-4 px-5">

                                {attendance.hours_worked || 0} hrs

                            </td>

                            <td className="py-4 px-5">

                                {attendance.overtime_hours || 0} hrs

                            </td>

                            <td className="py-4 px-5">

                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        attendance.attendance_status ===
                                        "PRESENT"
                                            ? "bg-green-500/20 text-green-400"
                                            : attendance.attendance_status ===
                                              "ABSENT"
                                            ? "bg-red-500/20 text-red-400"
                                            : attendance.attendance_status ===
                                              "LATE"
                                            ? "bg-yellow-500/20 text-yellow-400"
                                            : attendance.attendance_status ===
                                              "LEAVE"
                                            ? "bg-blue-500/20 text-blue-400"
                                            : attendance.attendance_status ===
                                              "SICK"
                                            ? "bg-purple-500/20 text-purple-400"
                                            : attendance.attendance_status ===
                                              "HOLIDAY"
                                            ? "bg-cyan-500/20 text-cyan-400"
                                            : "bg-slate-600 text-white"
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

                                        className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition"

                                    >

                                        <Eye size={18} />

                                    </button>

                                    <button

                                        onClick={() =>
                                            onEdit(attendance)
                                        }

                                        className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition"

                                    >

                                        <Pencil size={18} />

                                    </button>

                                    <button

                                        onClick={() =>
                                            onDelete(attendance)
                                        }

                                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition"

                                    >

                                        <Trash2 size={18} />

                                    </button>

                                </div>

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    );

}