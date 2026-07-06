import {
    Users,
    DollarSign,
    Wallet,
    TrendingUp
} from "lucide-react";

function StatCard({

    title,

    value,

    icon: Icon,

    color

}) {

    const colors = {

        blue: "bg-blue-500/20 text-blue-400",

        green: "bg-green-500/20 text-green-400",

        purple: "bg-purple-500/20 text-purple-400",

        yellow: "bg-yellow-500/20 text-yellow-400"

    };

    return (

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl">

            <div className="flex items-center justify-between">

                <div>

                    <p className="text-slate-400 text-sm">

                        {title}

                    </p>

                    <h2 className="text-4xl font-bold mt-3">

                        {value}

                    </h2>

                </div>

                <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center ${colors[color]}`}
                >
                    <Icon size={28} />
                </div>

            </div>

        </div>

    );

}

export default function PayrollStats({

    payrolls

}) {

    const totalEmployees = payrolls.length;

    const totalBasicSalary = payrolls.reduce(

        (sum, payroll) =>

            sum + Number(payroll.basic_salary || 0),

        0

    );

    const totalOvertime = payrolls.reduce(

        (sum, payroll) =>

            sum + Number(payroll.overtime_pay || 0),

        0

    );

    const totalNetSalary = payrolls.reduce(

        (sum, payroll) =>

            sum + Number(payroll.net_salary || 0),

        0

    );

    const cards = [

        {

            title: "Employees",

            value: totalEmployees,

            icon: Users,

            color: "blue"

        },

        {

            title: "Basic Salary",

            value: totalBasicSalary.toLocaleString(),

            icon: DollarSign,

            color: "green"

        },

        {

            title: "Overtime Pay",

            value: totalOvertime.toLocaleString(),

            icon: TrendingUp,

            color: "yellow"

        },

        {

            title: "Net Payroll",

            value: totalNetSalary.toLocaleString(),

            icon: Wallet,

            color: "purple"

        }

    ];

    return (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

            {

                cards.map((card, index) => (

                    <StatCard

                        key={index}

                        title={card.title}

                        value={card.value}

                        icon={card.icon}

                        color={card.color}

                    />

                ))

            }

        </div>

    );

}