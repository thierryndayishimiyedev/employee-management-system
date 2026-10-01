import { useEffect, useState } from "react";
import api from "../api/api";
import { useLanguage } from '../context/LanguageContext';

export default function AttendanceModal({

    open,

    attendance,

    onClose,

    onSuccess

}) {

    const { t } = useLanguage();

    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({

        employee_id: "",

        attendance_date: "",

        check_in: "",

        check_out: "",

        overtime_hours: "",

        attendance_status: "PRESENT",

        shift_type: "DAY",

        applied_daily_rate: "",

        rate_adjustment_reason: "",

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

                overtime_hours: attendance.overtime_hours || "",

                attendance_status: attendance.attendance_status || "PRESENT",

                shift_type: attendance.shift_type || "DAY",

                applied_daily_rate: attendance.applied_daily_rate ?? "",

                rate_adjustment_reason: attendance.rate_adjustment_reason || "",

                remarks: attendance.remarks || ""

            });

        } else {

            setFormData({

                employee_id: "",

                attendance_date: "",

                check_in: "",

                check_out: "",

                overtime_hours: "",

                attendance_status: "PRESENT",

                shift_type: "DAY",

                applied_daily_rate: "",

                rate_adjustment_reason: "",

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

                overtime_hours: formData.overtime_hours === "" ? null : Number(formData.overtime_hours)

            };

            if (attendance) {

                payload.manual_pay_by_hours = ["PRESENT", "LATE"].includes(payload.attendance_status);

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

                                t('attendanceModal.saveFailed')

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

                                ? t('attendanceModal.correct')

                                : t('attendanceModal.checkInWorker')

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

                                {t('attendanceModal.employee')}

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

                                    {t('attendanceModal.selectEmployee')}

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

                                {t('common.date')}

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

                                {t('attendanceModal.checkIn')}

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
                            <label className="text-sm text-slate-300">{t('attendanceModal.checkOut')}</label>
                            <input type="time" name="check_out" value={formData.check_out} onChange={handleChange} className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3" />
                            <p className="mt-1 text-xs text-slate-400">{t('attendanceModal.checkOutHelp')}</p>
                        </div>

                    </div>

                    <div className="grid md:grid-cols-2 gap-5">

                        <div className="rounded-xl border border-cyan-800 bg-cyan-950/40 px-4 py-3 text-sm text-cyan-100">
                            <p className="font-medium">{t('attendanceModal.hours')}</p>
                            <p className="mt-1 text-cyan-200">{t('attendanceModal.hoursHelp')}</p>
                        </div>

                        <div>

                            <label className="text-sm text-slate-300">

                                {t('common.status')}

                            </label>

                            <select

                                name="attendance_status"

                                value={formData.attendance_status}

                                onChange={handleChange}

                                className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"

                            >

                                <option value="PRESENT">

                                    {t('status.present')}

                                </option>

                                <option value="ABSENT">

                                    {t('status.absent')}

                                </option>

                                <option value="LEAVE">

                                    {t('status.leave')}

                                </option>

                                <option value="LATE">

                                    {t('status.late')}

                                </option>


                            </select>

                        </div>

                    </div>

                    <div className="grid md:grid-cols-2 gap-5">

                        <div>
                            <label className="text-sm text-slate-300">{t('attendanceModal.shift')}</label>
                            <select name="shift_type" value={formData.shift_type} onChange={handleChange} className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3">
                                <option value="DAY">{t('attendanceModal.day')}</option>
                                <option value="NIGHT">{t('attendanceModal.night')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm text-slate-300">{t('attendanceModal.rate')}</label>
                            <input type="number" min="0" name="applied_daily_rate" value={formData.applied_daily_rate} onChange={handleChange} placeholder={t('attendanceModal.normalRate')} className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3" />
                        </div>

                    </div>

                    <div>

                        <label className="text-sm text-slate-300">{t('attendanceModal.rateReason')}</label>
                        <textarea rows="2" name="rate_adjustment_reason" value={formData.rate_adjustment_reason} onChange={handleChange} placeholder={t('attendanceModal.rateReasonHelp')} className="mt-2 w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3" />

                    </div>

                    <div>

                        <label className="text-sm text-slate-300">

                            {t('attendanceModal.remarks')}

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

                            {t('common.cancel')}

                        </button>

                        <button

                            type="submit"

                            disabled={loading}

                            className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500"

                        >

                            {

                                loading

                                    ? t('attendanceModal.saving')

                                    : attendance

                                    ? t('attendanceModal.update')

                                    : t('attendanceModal.checkInWorker')

                            }

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );

}
