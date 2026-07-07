function Card({

    title,

    value,

    icon: Icon,

    color

}) {

    const colors = {

        blue: "bg-cyan-50 text-cyan-600 ring-cyan-100",

        green: "bg-emerald-50 text-emerald-600 ring-emerald-100",

        red: "bg-red-50 text-red-600 ring-red-100",

        yellow: "bg-amber-50 text-amber-600 ring-amber-100",

        purple: "bg-slate-100 text-slate-600 ring-slate-200"

    };

    return (

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">

            <div className="flex items-center justify-between">

                <div>

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">

                        {title}

                    </p>

                    <h2 className="mt-3 text-3xl font-bold text-slate-900">

                        {value}

                    </h2>

                </div>

                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ring-4 ${colors[color]}`}
                >
                    <Icon size={20} />
                </div>

            </div>

        </div>

    );

}

const AttendanceStats = ({

    cards

}) => {

    return (

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">

            {cards.map((card, index) => (

                <Card

                    key={index}

                    title={card.title}

                    value={card.value}

                    icon={card.icon}

                    color={card.color}

                />

            ))}

        </div>

    );

};

export default AttendanceStats;
