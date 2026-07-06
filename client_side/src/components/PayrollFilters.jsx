import { Search, RotateCcw } from "lucide-react";

export default function PayrollFilters({

    search,

    setSearch,

    monthFilter,

    setMonthFilter,

    yearFilter,

    setYearFilter

}) {

    const resetFilters = () => {

        setSearch("");

        setMonthFilter("");

        setYearFilter("");

    };

    return (

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl">

            <div className="grid lg:grid-cols-4 gap-4">

                {/* Search */}

                <div className="relative lg:col-span-2">

                    <Search

                        size={18}

                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"

                    />

                    <input

                        type="text"

                        placeholder="Search employee..."

                        value={search}

                        onChange={(e) =>

                            setSearch(e.target.value)

                        }

                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-cyan-500 outline-none"

                    />

                </div>

                {/* Month */}

                <select

                    value={monthFilter}

                    onChange={(e) =>

                        setMonthFilter(e.target.value)

                    }

                    className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-cyan-500 outline-none"

                >

                    <option value="">

                        All Months

                    </option>

                    <option value="1">January</option>

                    <option value="2">February</option>

                    <option value="3">March</option>

                    <option value="4">April</option>

                    <option value="5">May</option>

                    <option value="6">June</option>

                    <option value="7">July</option>

                    <option value="8">August</option>

                    <option value="9">September</option>

                    <option value="10">October</option>

                    <option value="11">November</option>

                    <option value="12">December</option>

                </select>

                {/* Year */}

                <div className="flex gap-3">

                    <input

                        type="number"

                        placeholder="Year"

                        value={yearFilter}

                        onChange={(e) =>

                            setYearFilter(e.target.value)

                        }

                        className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-cyan-500 outline-none"

                    />

                    <button

                        onClick={resetFilters}

                        className="px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center"

                    >

                        <RotateCcw size={18} />

                    </button>

                </div>

            </div>

        </div>

    );

}