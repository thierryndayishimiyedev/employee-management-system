import { useEffect, useMemo, useState } from "react";

import { getPayrolls } from "../api/payrollApi";

import PayrollHeader from "../components/PayrollHeader";
import PayrollStats from "../components/PayrollStats";
import PayrollFilters from "../components/PayrollFilters";
import PayrollTable from "../components/PayrollTable";
import PayrollSummary from "../components/PayrollSummary";
import PayrollModal from "../components/PayrollModal";

export default function PayrollPage() {

    const [payrolls, setPayrolls] = useState([]);

    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");

    const [monthFilter, setMonthFilter] = useState("");

    const [yearFilter, setYearFilter] = useState("");

    const [showModal, setShowModal] = useState(false);

    const loadPayrolls = async () => {

        try {

            const response = await getPayrolls();
            const payrollList = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response)
                    ? response
                    : [];

            setPayrolls(payrollList);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {

        loadPayrolls();

    }, []);

    const refreshPayroll = () => {

        setLoading(true);
        loadPayrolls();
    };

    const filteredPayrolls = useMemo(() => {

        return (payrolls || []).filter((payroll) => {

            const employeeName = [
                payroll?.employees?.first_name,
                payroll?.employees?.last_name
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const searchMatch =
                employeeName.includes(search.toLowerCase());

            const monthMatch =
                monthFilter === ""
                    ? true
                    : Number(payroll?.payroll_month) === Number(monthFilter);

            const yearMatch =
                yearFilter === ""
                    ? true
                    : Number(payroll?.payroll_year) === Number(yearFilter);

            return searchMatch && monthMatch && yearMatch;

        });

    }, [payrolls, search, monthFilter, yearFilter]);

    if (loading) {

        return (

            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">

                Loading Payroll...

            </div>

        );

    }

    return (

        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">

            <div className="max-w-7xl mx-auto space-y-8">

                <PayrollHeader

                    onRefresh={refreshPayroll}

                    onGenerate={() => setShowModal(true)}

                />

                <PayrollStats payrolls={filteredPayrolls} />

                <PayrollFilters

                    search={search}

                    setSearch={setSearch}

                    monthFilter={monthFilter}

                    setMonthFilter={setMonthFilter}

                    yearFilter={yearFilter}

                    setYearFilter={setYearFilter}

                />

                <PayrollTable

                    payrolls={filteredPayrolls}

                    onView={() => {}}

                    onDelete={() => {}}

                />

                <PayrollSummary payrolls={filteredPayrolls} />

                <PayrollModal

                    open={showModal}

                    onClose={() => setShowModal(false)}

                    onSuccess={() => {

                        setShowModal(false);
                        refreshPayroll();

                    }}

                />

            </div>

        </div>

    );

}