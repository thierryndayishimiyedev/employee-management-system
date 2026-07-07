export default function AttendanceSummary({ summary = [] }) {

    if (!summary.length) {

        return (

            <div className="py-10 text-center text-slate-500">

                No attendance summary available.

            </div>

        );

    }

    return (

        <div className="space-y-4">

            {summary.map((item, index) => (

                <div
                    key={index}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >

                    <div>

                        <h3 className="font-semibold text-slate-800">

                            {item.employee}

                        </h3>

                        <p className="text-sm text-slate-500">

                            {item.employee_code}

                        </p>

                    </div>

                    <div className="flex gap-6 text-center">

                        <div>

                            <p className="font-bold text-emerald-600">

                                {item.present}

                            </p>

                            <p className="text-xs text-slate-500">

                                Present

                            </p>

                        </div>

                        <div>

                            <p className="font-bold text-red-600">

                                {item.absent}

                            </p>

                            <p className="text-xs text-slate-500">

                                Absent

                            </p>

                        </div>

                        <div>

                            <p className="font-bold text-amber-600">

                                {item.late}

                            </p>

                            <p className="text-xs text-slate-500">

                                Late

                            </p>

                        </div>

                        <div>

                            <p className="font-bold text-cyan-600">

                                {item.leave}

                            </p>

                            <p className="text-xs text-slate-500">

                                Leave

                            </p>

                        </div>

                    </div>

                </div>

            ))}

        </div>

    );

}
