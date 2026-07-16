const supabase = require("../config/supabase");

const getOwnerDashboard = async (company_id) => {

    // TOTAL EMPLOYEES
    const { data: employees } = await supabase
        .from("employees")
        .select("employee_id")
        .eq("company_id", company_id);

    // TODAY ATTENDANCE
    const today = new Date().toISOString().split("T")[0];

    const { data: attendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("attendance_date", today)
        .eq("company_id", company_id);

    // TOTAL PAYROLL
    const { data: payroll } = await supabase
        .from("payroll")
        .select(`
            net_salary,
            employees!inner(company_id)
        `)
        .eq("employees.company_id", company_id);

    const totalPayroll = payroll?.reduce(
        (sum, p) => sum + Number(p.net_salary),
        0
    ) || 0;

    // TOTAL PRODUCTION
    const { data: production } = await supabase
        .from("production_records")
        .select(`
            quantity,
            employees!inner(company_id)
        `)
        .eq("employees.company_id", company_id);

    const totalProduction = production?.reduce(
        (sum, p) => sum + Number(p.quantity),
        0
    ) || 0;

    // PENDING ADVANCES
    const { data: advances } = await supabase
        .from("salary_advances")
        .select(`
            *,
            employees!inner(company_id)
        `)
        .eq("status", "PENDING")
        .eq("employees.company_id", company_id);

    return {
        total_employees: employees?.length || 0,
        today_attendance: attendance?.length || 0,
        total_payroll: totalPayroll,
        total_production: totalProduction,
        pending_advances: advances?.length || 0
    };

};

const getAccountantDashboard = async (company_id) => {

    const { data: pendingPayrolls } = await supabase
        .from("payroll")
        .select(`
            *,
            employees!inner(company_id)
        `)
        .in("payment_status", ["PENDING", "GENERATED"])
        .eq("employees.company_id", company_id);

    const { data: advances } = await supabase
        .from("salary_advances")
        .select(`
            *,
            employees!inner(company_id)
        `)
        .eq("status", "PENDING")
        .eq("employees.company_id", company_id);

    return {
        pending_payrolls: pendingPayrolls?.length || 0,
        pending_advances: advances?.length || 0
    };

};

const getManagerDashboard = async (company_id) => {

    const { data: employees } = await supabase
        .from("employees")
        .select("*")
        .eq("company_id", company_id);

    const { data: production } = await supabase
        .from("production_records")
        .select(`
            *,
            employees!inner(company_id)
        `)
        .eq("employees.company_id", company_id);

    return {
        total_workers: employees?.length || 0,
        production_records: production?.length || 0
    };

};

module.exports = {
    getOwnerDashboard,
    getAccountantDashboard,
    getManagerDashboard
};
