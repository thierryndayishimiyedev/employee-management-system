const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyId } = require("../utils/companyScope");

const isPayrollStatusConstraintError = (error) => {

    return (
        error?.code === "23514" &&
        String(error?.message || "").includes("payroll_payment_status_check")
    );

};

const persistPayroll = async (builder, payrollData) => {

    const { data, error } = await builder(payrollData);

    if (!isPayrollStatusConstraintError(error)) {
        if (error) throw error;
        return data;
    }

    const legacyPayrollData = {
        ...payrollData,
        payment_status: "PENDING"
    };

    const fallback = await builder(legacyPayrollData);

    if (fallback.error) throw fallback.error;

    return fallback.data;

};

const generatePayroll = async (employee_id, payroll_month, payroll_year, user) => {

    let employeeQuery = supabase
        .from("employees")
        .select("*")
        .eq("employee_id", employee_id);

    if (!isSuperAdmin(user)) {
        employeeQuery = employeeQuery.eq("company_id", requireCompanyId(user));
    }

    const { data: employee, error: employeeError } = await employeeQuery.single();

    if (employeeError || !employee)
        throw new Error("Employee not found.");

    const startDate = `${payroll_year}-${String(payroll_month).padStart(2, "0")}-01`;
    const endDate = `${payroll_year}-${String(payroll_month).padStart(2, "0")}-31`;

    const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee_id)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate);

    if (attendanceError)
        throw attendanceError;

    const daysWorked = attendance.filter(
        a => a.attendance_status === "PRESENT"
    ).length;

    const overtimeHours = attendance.reduce(
        (sum, a) => sum + Number(a.overtime_hours || 0),
        0
    );

    const basicSalary = daysWorked * Number(employee.daily_rate);

    const overtimePay = overtimeHours * (Number(employee.daily_rate) / 8);

    const { data: advances, error: advanceError } = await supabase
        .from("salary_advances")
        .select("amount")
        .eq("employee_id", employee_id)
        .eq("status", "APPROVED");

    if (advanceError)
        throw advanceError;

    const advanceDeduction = advances.reduce(
        (sum, a) => sum + Number(a.amount),
        0
    );

    const allowances = 0;
    const deductions = 0;

    const netSalary =
        basicSalary +
        overtimePay +
        allowances -
        deductions -
        advanceDeduction;

    const payrollData = {
        employee_id,
        payroll_month,
        payroll_year,
        days_worked: daysWorked,
        overtime_hours: overtimeHours,
        basic_salary: basicSalary,
        overtime_pay: overtimePay,
        allowances,
        deductions,
        advance_deduction: advanceDeduction,
        net_salary: netSalary,
        payment_status: "GENERATED"
    };

    const { data: existing } = await supabase
        .from("payroll")
        .select("payroll_id")
        .eq("employee_id", employee_id)
        .eq("payroll_month", payroll_month)
        .eq("payroll_year", payroll_year)
        .maybeSingle();

    if (existing) {

        return persistPayroll((data) => supabase
            .from("payroll")
            .update(data)
            .eq("payroll_id", existing.payroll_id)
            .select()
            .single(), payrollData);

    }

    return persistPayroll((data) => supabase
        .from("payroll")
        .insert([data])
        .select()
        .single(), payrollData);

};

const getPayrolls = async (user) => {

    let query = supabase
        .from("payroll")
        .select(`
            *,
            employees!inner(
                employee_code,
                first_name,
                last_name,
                company_id
            )
        `)
        .order("generated_at", {
            ascending: false
        });

    if (!isSuperAdmin(user)) {
        query = query.eq("employees.company_id", requireCompanyId(user));
    }

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getPayrollSummary = async (user) => {

    const payrolls = await getPayrolls(user);
    const groups = new Map();

    payrolls.forEach((payroll) => {
        const key = `${payroll.payroll_year}-${String(payroll.payroll_month).padStart(2, "0")}`;
        const group = groups.get(key) || {
            payroll_month: payroll.payroll_month,
            payroll_year: payroll.payroll_year,
            employees: 0,
            total_salary: 0,
            status: payroll.payment_status || "GENERATED"
        };

        group.employees += 1;
        group.total_salary += Number(payroll.net_salary || 0);

        if (group.status !== (payroll.payment_status || "GENERATED")) {
            group.status = "MIXED";
        }

        groups.set(key, group);
    });

    return Array.from(groups.values()).sort((a, b) => {
        if (a.payroll_year !== b.payroll_year) return b.payroll_year - a.payroll_year;
        return b.payroll_month - a.payroll_month;
    });

};

const getPayrollById = async (id, user) => {

    let query = supabase
        .from("payroll")
        .select(`
            *,
            employees!inner(
                employee_code,
                first_name,
                last_name,
                company_id
            )
        `)
        .eq("payroll_id", id);

    if (!isSuperAdmin(user)) {
        query = query.eq("employees.company_id", requireCompanyId(user));
    }

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

const deletePayroll = async (id, user) => {

    await getPayrollById(id, user);

    const { error } = await supabase
        .from("payroll")
        .delete()
        .eq("payroll_id", id);

    if (error)
        throw error;

    return true;

};

module.exports = {
    generatePayroll,
    getPayrolls,
    getPayrollSummary,
    getPayrollById,
    deletePayroll
};
