function Card({

    title,

    value,

    icon: Icon,

    color

}) {

    const colors = {

        blue: "bg-blue-500/20 text-blue-400",

        green: "bg-green-500/20 text-green-400",

        red: "bg-red-500/20 text-red-400",

        yellow: "bg-yellow-500/20 text-yellow-400",

        purple: "bg-purple-500/20 text-purple-400"

    };

    return (

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl hover:border-slate-600 transition">

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

const AttendanceStats = ({

    cards

}) => {

    return (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">

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