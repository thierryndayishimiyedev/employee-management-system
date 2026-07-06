import {
    Eye,
    Trash2,
    FileText
} from "lucide-react";

export default function PayrollTable({

    payrolls,

    onView,

    onDelete

}) {

    if (payrolls.length === 0) {

        return (

            <div className="p-10 text-center text-slate-400">

                No payroll records found.

            </div>

        );

    }

    return (

        <div className="overflow-x-auto">

            <table className="w-full">

                <thead className="bg-slate-800">

                    <tr>

                        <th className="text-left px-6 py-4">
                            Employee
                        </th>

                        <th className="text-left px-6 py-4">
                            Month
                        </th>

                        <th className="text-left px-6 py-4">
                            Days Worked
                        </th>

                        <th className="text-left px-6 py-4">
                            Overtime
                        </th>

                        <th className="text-left px-6 py-4">
                            Basic Salary
                        </th>

                        <th className="text-left px-6 py-4">
                            Advance
                        </th>

                        <th className="text-left px-6 py-4">
                            Net Salary
                        </th>

                        <th className="text-center px-6 py-4">
                            Actions
                        </th>

                    </tr>

                </thead>

                <tbody>

                    {payrolls.map((payroll) => (

                        <tr

                            key={payroll.payroll_id}

                            className="border-b border-slate-800 hover:bg-slate-800/40 transition"

                        >

                            <td className="px-6 py-4">

                                <div className="font-medium">

                                    {payroll.employees.first_name}{" "}

                                    {payroll.employees.last_name}

                                </div>

                                <div className="text-sm text-slate-400">

                                    {payroll.employees.employee_code}

                                </div>

                            </td>

                            <td className="px-6 py-4">

                                {payroll.payroll_month}/{payroll.payroll_year}

                            </td>

                            <td className="px-6 py-4">

                                {payroll.days_worked}

                            </td>

                            <td className="px-6 py-4">

                                {payroll.overtime_hours}

                            </td>

                            <td className="px-6 py-4 text-green-400 font-semibold">

                                {Number(payroll.basic_salary).toLocaleString()}

                            </td>

                            <td className="px-6 py-4 text-red-400">

                                {Number(payroll.advance_deduction).toLocaleString()}

                            </td>

                            <td className="px-6 py-4 text-cyan-400 font-bold">

                                {Number(payroll.net_salary).toLocaleString()}

                            </td>

                            <td className="px-6 py-4">

                                <div className="flex justify-center gap-3">

                                    <button

                                        onClick={() => onView(payroll)}

                                        className="text-cyan-400 hover:text-cyan-300"

                                    >

                                        <Eye size={18} />

                                    </button>

                                    <button

                                        onClick={() => onView(payroll)}

                                        className="text-green-400 hover:text-green-300"

                                    >

                                        <FileText size={18} />

                                    </button>

                                    <button

                                        onClick={() => onDelete(payroll)}

                                        className="text-red-400 hover:text-red-300"

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