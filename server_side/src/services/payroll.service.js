const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyIds, scopeByRelatedCompany } = require("../utils/companyScope");
const { applyPayrollAdvanceDeductions } = require("./advanceDeduction.service");

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

const parseDate = (value, label) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
        throw new Error(`A valid ${label} is required.`);
    }
    return new Date(`${value}T00:00:00Z`);
};

const resolvePayrollPeriod = ({ payroll_month, payroll_year, payroll_period_start, payroll_period_end, payroll_frequency }) => {
    const frequency = payroll_frequency || (payroll_period_start || payroll_period_end ? "BIWEEKLY" : "MONTHLY");
    if (!["MONTHLY", "BIWEEKLY"].includes(frequency)) throw new Error("Payroll frequency must be MONTHLY or BIWEEKLY.");
    if (frequency === "BIWEEKLY") {
        const start = parseDate(payroll_period_start, "payroll period start");
        const end = parseDate(payroll_period_end, "payroll period end");
        const days = Math.round((end - start) / 86400000) + 1;
        if (days !== 14) throw new Error("A biweekly payroll period must contain exactly 14 days, inclusive.");
        return {
            frequency,
            startDate: payroll_period_start,
            endDate: payroll_period_end,
            payroll_month: start.getUTCMonth() + 1,
            payroll_year: start.getUTCFullYear()
        };
    }
    const month = Number(payroll_month);
    const year = Number(payroll_year);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000) {
        throw new Error("A valid payroll month and year are required.");
    }
    const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return { frequency, startDate: `${year}-${String(month).padStart(2, "0")}-01`, endDate: `${year}-${String(month).padStart(2, "0")}-${endDay}`, payroll_month: month, payroll_year: year };
};

const generatePayroll = async (payload, user) => {
    const { employee_id } = payload;
    const period = resolvePayrollPeriod(payload);

    let employeeQuery = supabase
        .from("employees")
        .select("*")
        .eq("employee_id", employee_id);

    if (!isSuperAdmin(user)) {
        employeeQuery = employeeQuery.in("company_id", requireCompanyIds(user));
    }

    const { data: employee, error: employeeError } = await employeeQuery.single();

    if (employeeError || !employee)
        throw new Error("Employee not found.");

    const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee_id)
        .gte("attendance_date", period.startDate)
        .lte("attendance_date", period.endDate);

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

    const allowances = 0;
    const deductions = 0;

    const payrollData = {
        employee_id,
        company_id: employee.company_id,
        payroll_month: period.payroll_month,
        payroll_year: period.payroll_year,
        payroll_period_start: period.frequency === "BIWEEKLY" ? period.startDate : null,
        payroll_period_end: period.frequency === "BIWEEKLY" ? period.endDate : null,
        payroll_frequency: period.frequency,
        days_worked: daysWorked,
        overtime_hours: overtimeHours,
        basic_salary: basicSalary,
        overtime_pay: overtimePay,
        allowances,
        deductions,
        advance_deduction: 0,
        net_salary: basicSalary + overtimePay + allowances - deductions,
        payment_status: "GENERATED",
        approval_status: "GENERATED"
    };

    let existingQuery = supabase.from("payroll").select("payroll_id").eq("employee_id", employee_id);
    if (period.frequency === "BIWEEKLY") {
        existingQuery = existingQuery.eq("payroll_frequency", "BIWEEKLY")
            .eq("payroll_period_start", period.startDate)
            .eq("payroll_period_end", period.endDate);
    } else {
        existingQuery = existingQuery.eq("payroll_frequency", "MONTHLY")
            .eq("payroll_month", period.payroll_month)
            .eq("payroll_year", period.payroll_year);
    }
    const { data: existing, error: existingError } = await existingQuery.maybeSingle();
    if (existingError) throw existingError;

    // A regenerated period must not silently rewrite a payroll with an immutable
    // advance-deduction ledger.  Return it instead.
    if (existing) return getPayrollById(existing.payroll_id, user);

    const payroll = await persistPayroll((data) => supabase
        .from("payroll")
        .insert([data])
        .select()
        .single(), payrollData);
    const advanceDeduction = await applyPayrollAdvanceDeductions({ payrollId: payroll.payroll_id, employeeId: employee_id, createdBy: user?.user_id });
    const { data: finalized, error: finalizeError } = await supabase.from("payroll").update({
        advance_deduction: advanceDeduction,
        net_salary: Math.max(0, basicSalary + overtimePay + allowances - deductions - advanceDeduction)
    }).eq("payroll_id", payroll.payroll_id).select().single();
    if (finalizeError) throw finalizeError;
    return finalized;

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

    query = scopeByRelatedCompany(query, user);

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getPayrollSummary = async (user) => {

    const payrolls = await getPayrolls(user);
    const groups = new Map();

    payrolls.forEach((payroll) => {
        const key = payroll.payroll_frequency === "BIWEEKLY"
            ? `BIWEEKLY-${payroll.payroll_period_start}-${payroll.payroll_period_end}`
            : `MONTHLY-${payroll.payroll_year}-${String(payroll.payroll_month).padStart(2, "0")}`;
        const group = groups.get(key) || {
            payroll_month: payroll.payroll_month,
            payroll_year: payroll.payroll_year,
            payroll_frequency: payroll.payroll_frequency || "MONTHLY",
            payroll_period_start: payroll.payroll_period_start || null,
            payroll_period_end: payroll.payroll_period_end || null,
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

    query = scopeByRelatedCompany(query, user);

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
