import { useEffect, useState } from "react";
import api from "../api/api";

export default function AttendanceModal({

    open,

    attendance,

    onClose,

    onSuccess

}) {

    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({

        employee_id: "",

        attendance_date: "",

        check_in: "",

        check_out: "",

        hours_worked: "",

        overtime_hours: "",

        attendance_status: "PRESENT",

        remarks: ""

    });

    useEffect(() => {

        if (!open) return;

        fetchEmployees();

    }, [open]);

    useEffect(() => {

        if (attendance) {

            setFormData({

                employee_id: attendance.employee_id,

                attendance_date: attendance.attendance_date,

                check_in: attendance.check_in || "",

                check_out: attendance.check_out || "",

                hours_worked: attendance.hours_worked || "",

                overtime_hours: attendance.overtime_hours || "",

                attendance_status: attendance.attendance_status || "PRESENT",

                remarks: attendance.remarks || ""

            });

        } else {

            setFormData({

                employee_id: "",

                attendance_date: "",

                check_in: "",

                check_out: "",

                hours_worked: "",

                overtime_hours: "",

                attendance_status: "PRESENT",

                remarks: ""

            });

        }

    }, [attendance]);

    const fetchEmployees = async () => {

        try {

            const response = await api.get("/employees");

            setEmployees(Array.isArray(response?.data?.data) ? response.data.data : []);

        } catch {

            setEmployees([]);

        }

    };

    const handleChange = (e) => {

        setFormData({

            ...formData,

            [e.target.name]: e.target.value

        });

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        setLoading(true);

        try {

            const payload = {

                ...formData,

                employee_id: formData.employee_id || null,

                hours_worked: formData.hours_worked === "" ? null : Number(formData.hours_worked),

                overtime_hours: formData.overtime_hours === "" ? null : Number(formData.overtime_hours)

            };

            if (attendance) {

                await api.put(

                    `/attendance/${attendance.attendance_id}`,

                    payload

                );

            } else {

                await api.post(

                    "/attendance",

                    payload

                );

            }

            onSuccess();

        } catch (error) {

            alert(

                error.response?.data?.message ||

                "Something went wrong"

            );

        } finally {

            setLoading(false);

        }

    };

    if (!open) return null;

    return (

        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-5">

            <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">

                <div className="flex justify-between items-center border-b border-slate-700 p-6">

                    <h2 className="text-2xl font-bold text-white">

                        {

                            attendance

                                ? "Edit Attendance"

                                : "Record Attendance"

                        }

                    </h2>

                    <button

                        onClick={onClose}

                        className="text-slate-400 hover:text-white text-xl"

                    >

                        ✕

                    </button>

                </div>

                <form

                    onSubmit={handleSubmit}

                    className="p-6 space-y-5"

                >

                    <div className="grid md:grid-cols-2 gap-5">

                        <div>

                            <label className="text-sm text-slate-300">

                                Employee

                            </label>

                            <select

                                name="employee_id"

                                value={formData.employee_id}

                                onChange={handleChange}

                                required

                                disabled={attendance}

                                className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"

                            >

                                <option value="">

                                    Select Employee

                                </option>

                                {

                                    employees.map(employee => (

                                        <option

                                            key={employee.employee_id}

                                            value={employee.employee_id}

                                        >

                                            {

                                                employee.employee_code

                                            }

                                            {" - "}

                                            {

                                                employee.first_name

                                            }

                                            {" "}

                                            {

                                                employee.last_name

                                            }

                                        </option>

                                    ))

                                }

                            </select>

                        </div>

                        <div>

                            <label className="text-sm text-slate-300">

                                Date

                            </label>

                            <input

                                type="date"

                                name="attendance_date"

                                value={formData.attendance_date}

                                onChange={handleChange}

                                required

                                className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"

                            />

                        </div>

                    </div>

                    <div className="grid md:grid-cols-2 gap-5">

                        <div>

                            <label className="text-sm text-slate-300">

                                Check In

                            </label>

                            <input

                                type="time"

                                name="check_in"

                                value={formData.check_in}

                                onChange={handleChange}

                                className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"

                            />

                        </div>

                        <div>

                            <label className="text-sm text-slate-300">

                                Check Out

                            </label>

                            <input

                                type="time"

                                name="check_out"

                                value={formData.check_out}

                                onChange={handleChange}

                                className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"

                            />

                        </div>

                    </div>

                    <div className="grid md:grid-cols-3 gap-5">

                        <div>

                            <label className="text-sm text-slate-300">

                                Hours Worked

                            </label>

                            <input

                                type="number"

                                step="0.5"

                                name="hours_worked"

                                value={formData.hours_worked}

                                onChange={handleChange}

                                className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"

                            />

                        </div>

                        <div>

                            <label className="text-sm text-slate-300">

                                Overtime

                            </label>

                            <input

                                type="number"

                                step="0.5"

                                name="overtime_hours"

                                value={formData.overtime_hours}

                                onChange={handleChange}

                                className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"

                            />

                        </div>

                        <div>

                            <label className="text-sm text-slate-300">

                                Status

                            </label>

                            <select

                                name="attendance_status"

                                value={formData.attendance_status}

                                onChange={handleChange}

                                className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"

                            >

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

                        </div>

                    </div>

                    <div>

                        <label className="text-sm text-slate-300">

                            Remarks

                        </label>

                        <textarea

                            rows="4"

                            name="remarks"

                            value={formData.remarks}

                            onChange={handleChange}

                            className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"

                        />

                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">

                        <button

                            type="button"

                            onClick={onClose}

                            className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600"

                        >

                            Cancel

                        </button>

                        <button

                            type="submit"

                            disabled={loading}

                            className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500"

                        >

                            {

                                loading

                                    ? "Saving..."

                                    : attendance

                                    ? "Update Attendance"

                                    : "Record Attendance"

                            }

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );

}
