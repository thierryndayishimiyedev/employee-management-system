import { RefreshCw, Plus } from "lucide-react";

export default function PayrollHeader({

    onRefresh,

    onGenerate

}) {

    return (

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <div>

                <h1 className="text-4xl font-bold text-white">

                    Payroll Management

                </h1>

                <p className="text-slate-400 mt-2">

                    Generate, manage and monitor employee payroll.

                </p>

            </div>

            <div className="flex flex-wrap gap-3">

                <button

                    onClick={onRefresh}

                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition"

                >

                    <RefreshCw size={18} />

                    Refresh

                </button>

                <button

                    onClick={onGenerate}

                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 transition"

                >

                    <Plus size={18} />

                    Generate Payroll

                </button>

            </div>

        </div>

    );

}