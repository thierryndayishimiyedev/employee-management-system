export default function PayrollDetail({

    payroll,

    onClose

}) {

    if (!payroll) return null;

    return (

        <div className="space-y-6">

            <div className="grid md:grid-cols-2 gap-6">

                <div className="bg-slate-800 rounded-xl p-4">

                    <p className="text-slate-400 text-sm">

                        Employee

                    </p>

                    <h3 className="text-lg font-semibold mt-1">

                        {payroll.employees?.first_name}{" "}

                        {payroll.employees?.last_name}

                    </h3>

                    <p className="text-slate-400 text-sm">

                        {payroll.employees?.employee_code}

                    </p>

                </div>

                <div className="bg-slate-800 rounded-xl p-4">

                    <p className="text-slate-400 text-sm">

                        Payroll Period

                    </p>

                    <h3 className="text-lg font-semibold mt-1">

                        {payroll.payroll_month} / {payroll.payroll_year}

                    </h3>

                </div>

            </div>

            <div className="grid md:grid-cols-2 gap-4">

                <div className="bg-slate-800 rounded-xl p-4">

                    <p className="text-slate-400 text-sm">

                        Days Worked

                    </p>

                    <h2 className="text-2xl font-bold">

                        {payroll.days_worked}

                    </h2>

                </div>

                <div className="bg-slate-800 rounded-xl p-4">

                    <p className="text-slate-400 text-sm">

                        Overtime Hours

                    </p>

                    <h2 className="text-2xl font-bold">

                        {payroll.overtime_hours}

                    </h2>

                </div>

            </div>

            <div className="border border-slate-700 rounded-xl overflow-hidden">

                <table className="w-full">

                    <tbody>

                        <tr className="border-b border-slate-700">

                            <td className="px-5 py-4 text-slate-400">

                                Basic Salary

                            </td>

                            <td className="px-5 py-4 text-right font-semibold">

                                {Number(payroll.basic_salary).toLocaleString()}

                            </td>

                        </tr>

                        <tr className="border-b border-slate-700">

                            <td className="px-5 py-4 text-slate-400">

                                Overtime Pay

                            </td>

                            <td className="px-5 py-4 text-right font-semibold">

                                {Number(payroll.overtime_pay).toLocaleString()}

                            </td>

                        </tr>

                        <tr className="border-b border-slate-700">

                            <td className="px-5 py-4 text-slate-400">

                                Allowances

                            </td>

                            <td className="px-5 py-4 text-right font-semibold">

                                {Number(payroll.allowances).toLocaleString()}

                            </td>

                        </tr>

                        <tr className="border-b border-slate-700">

                            <td className="px-5 py-4 text-slate-400">

                                Deductions

                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-red-400">

                                - {Number(payroll.deductions).toLocaleString()}

                            </td>

                        </tr>

                        <tr className="border-b border-slate-700">

                            <td className="px-5 py-4 text-slate-400">

                                Salary Advance

                            </td>

                            <td className="px-5 py-4 text-right font-semibold text-red-400">

                                - {Number(payroll.advance_deduction).toLocaleString()}

                            </td>

                        </tr>

                        <tr>

                            <td className="px-5 py-5 text-xl font-bold">

                                Net Salary

                            </td>

                            <td className="px-5 py-5 text-right text-2xl font-bold text-green-400">

                                {Number(payroll.net_salary).toLocaleString()}

                            </td>

                        </tr>

                    </tbody>

                </table>

            </div>

            <div className="flex justify-end">

                <button

                    onClick={onClose}

                    className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 transition"

                >

                    Close

                </button>

            </div>

        </div>

    );

}