export default function AttendanceSummary({ summary = [] }) {

    if (!summary.length) {

        return (

            <div className="text-center py-10 text-slate-400">

                No attendance summary available.

            </div>

        );

    }

    return (

        <div className="space-y-4">

            {summary.map((item, index) => (

                <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-800 border border-slate-700"
                >

                    <div>

                        <h3 className="font-semibold text-white">

                            {item.employee}

                        </h3>

                        <p className="text-sm text-slate-400">

                            {item.employee_code}

                        </p>

                    </div>

                    <div className="flex gap-6 text-center">

                        <div>

                            <p className="text-green-400 font-bold">

                                {item.present}

                            </p>

                            <p className="text-xs text-slate-400">

                                Present

                            </p>

                        </div>

                        <div>

                            <p className="text-red-400 font-bold">

                                {item.absent}

                            </p>

                            <p className="text-xs text-slate-400">

                                Absent

                            </p>

                        </div>

                        <div>

                            <p className="text-yellow-400 font-bold">

                                {item.late}

                            </p>

                            <p className="text-xs text-slate-400">

                                Late

                            </p>

                        </div>

                        <div>

                            <p className="text-blue-400 font-bold">

                                {item.leave}

                            </p>

                            <p className="text-xs text-slate-400">

                                Leave

                            </p>

                        </div>

                    </div>

                </div>

            ))}

        </div>

    );

}