import { useEffect, useState } from "react";
import { getWorkers } from "../api/worker.api";
import { createPayroll } from "../api/payrollApi";
import toast from "react-hot-toast";

export default function PayrollModal({

    open,

    onClose,

    onSuccess

}) {

    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({

        employee_id: "",

        payroll_month: new Date().getMonth() + 1,

        payroll_year: new Date().getFullYear()

    });

    useEffect(() => {

        if (!open)
            return;

        loadEmployees();

    }, [open]);

    const loadEmployees = async () => {

        try {

            const response = await getWorkers();
            const workerList = Array.isArray(response?.data?.data)
                ? response.data.data
                : Array.isArray(response?.data)
                    ? response.data
                    : [];

            setEmployees(workerList);

        } catch (err) {

            console.error(err);

            toast.error("Failed to load employees.");

        }

    };

    const handleChange = (e) => {

        setForm({

            ...form,

            [e.target.name]: e.target.value

        });

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            setLoading(true);

            const response = await createPayroll(form);

            toast.success(response.message);

            onSuccess();

        } catch (err) {

            toast.error(

                err.response?.data?.message ||

                "Failed to generate payroll."

            );

        } finally {

            setLoading(false);

        }

    };

    if (!open)
        return null;

    return (

        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

            <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 p-6">

                <div className="flex justify-between items-center mb-6">

                    <h2 className="text-2xl font-bold">

                        Generate Payroll

                    </h2>

                    <button

                        onClick={onClose}

                        className="text-slate-400 hover:text-white"

                    >

                        ✕

                    </button>

                </div>

                <form

                    onSubmit={handleSubmit}

                    className="space-y-5"

                >

                    <div>

                        <label className="block mb-2 text-sm">

                            Employee

                        </label>

                        <select

                            name="employee_id"

                            value={form.employee_id}

                            onChange={handleChange}

                            required

                            className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"

                        >

                            <option value="">

                                Select Employee

                            </option>

                            {employees.map(employee => (

                                <option

                                    key={employee.employee_id || employee.id}

                                    value={employee.employee_id || employee.id}

                                >

                                    {employee.employee_code || employee.code || employee.id} - {employee.first_name || employee.name || "Employee"} {employee.last_name || ""}

                                </option>

                            ))}

                        </select>

                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <div>

                            <label className="block mb-2 text-sm">

                                Month

                            </label>

                            <select

                                name="payroll_month"

                                value={form.payroll_month}

                                onChange={handleChange}

                                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"

                            >

                                {Array.from({ length: 12 }).map((_, i) => (

                                    <option

                                        key={i}

                                        value={i + 1}

                                    >

                                        {i + 1}

                                    </option>

                                ))}

                            </select>

                        </div>

                        <div>

                            <label className="block mb-2 text-sm">

                                Year

                            </label>

                            <input

                                type="number"

                                name="payroll_year"

                                value={form.payroll_year}

                                onChange={handleChange}

                                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3"

                            />

                        </div>

                    </div>

                    <div className="flex justify-end gap-3 pt-4">

                        <button

                            type="button"

                            onClick={onClose}

                            className="px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600"

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

                                    ? "Generating..."

                                    : "Generate Payroll"

                            }

                        </button>

                    </div>

                </form>

            </div>

        </div>

    );

}