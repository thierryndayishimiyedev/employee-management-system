import { useEffect, useState } from "react";

import { getEmployees } from "../api/employeeApi";
import { createPayroll } from "../api/payrollApi";

export default function PayrollForm({

    payroll,

    onSuccess,

    onCancel

}) {

    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({

        employee_id: "",

        payroll_month: new Date().getMonth() + 1,

        payroll_year: new Date().getFullYear()

    });

    useEffect(() => {

        loadEmployees();

    }, []);

    useEffect(() => {

        if (payroll) {

            setFormData({

                employee_id: payroll.employee_id,

                payroll_month: payroll.payroll_month,

                payroll_year: payroll.payroll_year

            });

        }

    }, [payroll]);

    const loadEmployees = async () => {

        try {

            const response = await getEmployees();

            setEmployees(response.data);

        } catch (error) {

            console.error(error);

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

        try {

            setLoading(true);

            await createPayroll(formData);

            onSuccess();

        } catch (error) {

            alert(

                error.response?.data?.message ||

                "Failed to generate payroll."

            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <form

            onSubmit={handleSubmit}

            className="space-y-6"

        >

            <div>

                <label className="block mb-2 text-sm text-slate-300">

                    Employee

                </label>

                <select

                    name="employee_id"

                    value={formData.employee_id}

                    onChange={handleChange}

                    required

                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-cyan-500 outline-none"

                >

                    <option value="">

                        Select Employee

                    </option>

                    {employees.map((employee) => (

                        <option

                            key={employee.employee_id}

                            value={employee.employee_id}

                        >

                            {employee.employee_code} - {employee.first_name} {employee.last_name}

                        </option>

                    ))}

                </select>

            </div>

            <div className="grid md:grid-cols-2 gap-4">

                <div>

                    <label className="block mb-2 text-sm text-slate-300">

                        Payroll Month

                    </label>

                    <select

                        name="payroll_month"

                        value={formData.payroll_month}

                        onChange={handleChange}

                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-cyan-500 outline-none"

                    >

                        {Array.from({ length: 12 }, (_, i) => (

                            <option

                                key={i + 1}

                                value={i + 1}

                            >

                                {i + 1}

                            </option>

                        ))}

                    </select>

                </div>

                <div>

                    <label className="block mb-2 text-sm text-slate-300">

                        Payroll Year

                    </label>

                    <input

                        type="number"

                        name="payroll_year"

                        value={formData.payroll_year}

                        onChange={handleChange}

                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-cyan-500 outline-none"

                    />

                </div>

            </div>

            <div className="flex justify-end gap-3 pt-4">

                <button

                    type="button"

                    onClick={onCancel}

                    className="px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition"

                >

                    Cancel

                </button>

                <button

                    type="submit"

                    disabled={loading}

                    className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 transition disabled:opacity-50"

                >

                    {loading

                        ? "Generating..."

                        : "Generate Payroll"}

                </button>

            </div>

        </form>

    );

}