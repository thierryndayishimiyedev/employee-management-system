import React from "react";
import {
    Wallet,
    BadgeDollarSign,
    TrendingUp,
    MinusCircle
} from "lucide-react";

function SummaryCard({

    title,

    value,

    icon: Icon,

    color

}) {

    const colors = {

        blue: "bg-blue-500/20 text-blue-400",

        green: "bg-green-500/20 text-green-400",

        yellow: "bg-yellow-500/20 text-yellow-400",

        red: "bg-red-500/20 text-red-400"

    };

    return (

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">

            <div className="flex items-center justify-between">

                <div>

                    <p className="text-slate-400 text-sm">

                        {title}

                    </p>

                    <h2 className="text-2xl font-bold mt-2">

                        {value}

                    </h2>

                </div>

                <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}
                >
                    <Icon size={24} />
                </div>

            </div>

        </div>

    );

}

export default function PayrollSummary({

    payrolls

}) {

    const totalPayroll = payrolls.reduce(

        (sum, payroll) =>

            sum + Number(payroll.net_salary || 0),

        0

    );

    const totalBasic = payrolls.reduce(

        (sum, payroll) =>

            sum + Number(payroll.basic_salary || 0),

        0

    );

    const totalOvertime = payrolls.reduce(

        (sum, payroll) =>

            sum + Number(payroll.overtime_pay || 0),

        0

    );

    const totalDeductions = payrolls.reduce(

        (sum, payroll) =>

            sum +

            Number(payroll.deductions || 0) +

            Number(payroll.advance_deduction || 0),

        0

    );

    return (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

            <SummaryCard

                title="Net Payroll"

                value={`RWF ${totalPayroll.toLocaleString()}`}

                icon={Wallet}

                color="green"

            />

            <SummaryCard

                title="Basic Salary"

                value={`RWF ${totalBasic.toLocaleString()}`}

                icon={BadgeDollarSign}

                color="blue"

            />

            <SummaryCard

                title="Overtime Pay"

                value={`RWF ${totalOvertime.toLocaleString()}`}

                icon={TrendingUp}

                color="yellow"

            />

            <SummaryCard

                title="Total Deductions"

                value={`RWF ${totalDeductions.toLocaleString()}`}

                icon={MinusCircle}

                color="red"

            />

        </div>

    );

}