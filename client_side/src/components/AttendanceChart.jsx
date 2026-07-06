export default function AttendanceChart({ data = [] }) {

    const maxValue = Math.max(
        ...data.map((item) => item.total || item.value || 0),
        1
    );

    return (

        <div>

            <div className="flex items-end gap-4 h-64">

                {data.map((item, index) => {

                    const value = item.total ?? item.value ?? 0;

                    const label = item.day ?? item.label ?? "";

                    return (

                        <div
                            key={index}
                            className="flex flex-col items-center flex-1"
                        >

                            <span className="text-xs text-slate-300 mb-2">

                                {value}

                            </span>

                            <div
                                className="w-full rounded-t-xl bg-gradient-to-t from-cyan-600 to-blue-400 hover:opacity-80 transition-all duration-300"
                                style={{
                                    height: `${Math.max(
                                        (value / maxValue) * 200,
                                        8
                                    )}px`
                                }}
                            />

                            <span className="mt-3 text-sm text-slate-400">

                                {label}

                            </span>

                        </div>

                    );

                })}

            </div>

        </div>

    );

}