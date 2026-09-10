const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyIds, scopeByRelatedCompany } = require("../utils/companyScope");
const { applyPayrollAdvanceDeductions } = require("./advanceDeduction.service");
const { applyPayrollConsumptionDeductions } = require("./workerConsumptionDeduction.service");
const { scopeByManager, assertEmployeeManager } = require("../utils/managerScope");

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

const isoDate = (date) => date.toISOString().slice(0, 10);
const addCalendarDays = (value, days) => {
    const date = parseDate(value, "payroll date");
    date.setUTCDate(date.getUTCDate() + days);
    return isoDate(date);
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
    assertEmployeeManager(employee, user);
    if (!employee.manager_user_id) throw new Error("Employee is not assigned to a manager.");

    // An attendance day may only be settled once. Exact-period uniqueness is
    // insufficient because periods such as 7–20 overlap a prior 1–14 period.
    if (period.frequency === "BIWEEKLY") {
        const { data: overlapping, error: overlapError } = await supabase
            .from("payroll")
            .select("payroll_id, payroll_period_start, payroll_period_end")
            .eq("employee_id", employee_id)
            .eq("payroll_frequency", "BIWEEKLY")
            .lte("payroll_period_start", period.endDate)
            .gte("payroll_period_end", period.startDate)
            .limit(1);
        if (overlapError) throw overlapError;
        if (overlapping?.length) {
            const prior = overlapping[0];
            throw new Error(`Payroll cannot overlap paid/calculated attendance. ${prior.payroll_period_start} to ${prior.payroll_period_end} was already calculated; start after ${prior.payroll_period_end}.`);
        }
    }

    const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee_id)
        .gte("attendance_date", period.startDate)
        .lte("attendance_date", period.endDate);

    if (attendanceError)
        throw attendanceError;

    // Sunday records are excluded even if legacy data contains them. Sunday is
    // a company rest day and cannot increase a worker's paid days.
    const daysWorked = attendance.filter((record) => (
        ["PRESENT", "LATE"].includes(record.attendance_status) && new Date(`${record.attendance_date}T00:00:00Z`).getUTCDay() !== 0
    )).length;

    const overtimeHours = attendance.reduce(
        (sum, a) => sum + Number(a.overtime_hours || 0),
        0
    );

    let flexibleEntries = [];
    if (employee.payment_type === "FLEXIBLE_DAILY") {
        let entryQuery = supabase.from("flexible_work_entries").select("*").eq("employee_id", employee_id).gte("work_date", period.startDate).lte("work_date", period.endDate).is("payroll_id", null);
        const { data, error } = await entryQuery; if (error) throw error;
        flexibleEntries = data || [];
        if (!flexibleEntries.length) throw new Error("No unpaid flexible-work entries exist for this payroll period.");
    }
    const paidDays = employee.payment_type === "FLEXIBLE_DAILY" ? flexibleEntries.length : daysWorked;
    const basicSalary = employee.payment_type === "FLEXIBLE_DAILY" ? flexibleEntries.reduce((sum, row) => sum + Number(row.agreed_daily_rate || 0), 0) : daysWorked * Number(employee.daily_rate);
    if (employee.payment_type !== "FLEXIBLE_DAILY" && paidDays === 0) {
        throw new Error("No recorded worked attendance exists for this payroll period.");
    }

    // The agreed biweekly formula is paid days × daily rate, less advances
    // and worker consumptions. Overtime remains visible for reporting only.
    const overtimePay = 0;

    const allowances = 0;
    const deductions = 0;

    const payrollData = {
        employee_id,
        company_id: employee.company_id,
        manager_user_id: employee.manager_user_id,
        payroll_month: period.payroll_month,
        payroll_year: period.payroll_year,
        payroll_period_start: period.frequency === "BIWEEKLY" ? period.startDate : null,
        payroll_period_end: period.frequency === "BIWEEKLY" ? period.endDate : null,
        payroll_frequency: period.frequency,
        days_worked: paidDays,
        overtime_hours: overtimeHours,
        basic_salary: basicSalary,
        overtime_pay: overtimePay,
        allowances,
        deductions,
        advance_deduction: 0,
        consumption_deduction: 0,
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
    const consumptionDeduction = await applyPayrollConsumptionDeductions({ payrollId: payroll.payroll_id, employeeId: employee_id, periodEnd: period.endDate, createdBy: user?.user_id });
    const { data: finalized, error: finalizeError } = await supabase.from("payroll").update({
        advance_deduction: advanceDeduction,
        consumption_deduction: consumptionDeduction,
        net_salary: Math.max(0, basicSalary + overtimePay + allowances - deductions - advanceDeduction - consumptionDeduction)
    }).eq("payroll_id", payroll.payroll_id).select().single();
    if (finalizeError) throw finalizeError;
    if (flexibleEntries.length) {
        const { error: markError } = await supabase.from("flexible_work_entries").update({ payroll_id: payroll.payroll_id }).in("flexible_work_id", flexibleEntries.map((row) => row.flexible_work_id));
        if (markError) throw markError;
    }
    return finalized;

};

// The batch path deliberately delegates every worker to generatePayroll. This
// keeps the same scope checks, deductions, flexible-work calculation, and
// duplicate-period protection as the individual payroll action.
const generatePayrollForAll = async (payload, user) => {
    const period = resolvePayrollPeriod(payload);
    let workersQuery = supabase
        .from("employees")
        .select("employee_id, employee_code, first_name, last_name, company_id, manager_user_id, payment_type")
        .eq("is_worker", true)
        .order("first_name", { ascending: true })
        .order("last_name", { ascending: true });

    if (!isSuperAdmin(user)) workersQuery = workersQuery.in("company_id", requireCompanyIds(user));
    workersQuery = scopeByManager(workersQuery, user);

    const { data: workers, error } = await workersQuery;
    if (error) throw error;
    if (!workers?.length) throw new Error("No workers are available in your manager scope.");

    const result = {
        period: { frequency: period.frequency, start_date: period.startDate, end_date: period.endDate },
        workers_considered: workers.length,
        generated: [],
        skipped: [],
        failed: []
    };

    for (const worker of workers) {
        const employee_name = `${worker.first_name || ""} ${worker.last_name || ""}`.trim() || worker.employee_code;
        try {
            const payroll = await generatePayroll({ ...payload, employee_id: worker.employee_id }, user);
            result.generated.push({ payroll_id: payroll.payroll_id, employee_id: worker.employee_id, employee_code: worker.employee_code, employee_name, days_worked: payroll.days_worked, net_salary: payroll.net_salary });
        } catch (workerError) {
            const reason = workerError.message || "Could not calculate payroll.";
            const row = { employee_id: worker.employee_id, employee_code: worker.employee_code, employee_name, reason };
            // A protected overlap is intentionally skipped: no second payroll
            // can ever be created for days already calculated or paid.
            if (/cannot overlap|already calculated|already exists|no recorded worked attendance|no unpaid flexible-work/i.test(reason)) result.skipped.push(row);
            else result.failed.push(row);
        }
    }
    return result;
};

// Gives accountants a real calendar reminder. Any calculated payroll closes
// its complete 14-day calendar window, even before it is approved or paid.
const getPayrollDateGuidance = async (user) => {
    const payrolls = await getPayrolls(user);
    const prior = payrolls
        .filter((row) => row.payroll_frequency === "BIWEEKLY" && row.payroll_period_end)
        .sort((a, b) => String(b.payroll_period_end).localeCompare(String(a.payroll_period_end)))[0];

    if (prior) {
        const startDate = addCalendarDays(prior.payroll_period_end, 1);
        return {
            last_calculated_period: { start_date: prior.payroll_period_start, end_date: prior.payroll_period_end },
            suggested_period: { start_date: startDate, end_date: addCalendarDays(startDate, 13) },
            message: `Last payroll was ${prior.payroll_period_start} to ${prior.payroll_period_end}. The next valid 14-day period is ${startDate} to ${addCalendarDays(startDate, 13)}.`
        };
    }

    let workersQuery = supabase.from("employees").select("employee_id").eq("is_worker", true);
    if (!isSuperAdmin(user)) workersQuery = workersQuery.in("company_id", requireCompanyIds(user));
    workersQuery = scopeByManager(workersQuery, user);
    const { data: workers, error: workersError } = await workersQuery;
    if (workersError) throw workersError;
    const workerIds = (workers || []).map((worker) => worker.employee_id);
    if (!workerIds.length) return { last_calculated_period: null, suggested_period: null, message: "No workers are available in this scope yet." };

    const [attendanceResult, flexibleResult] = await Promise.all([
        supabase.from("attendance").select("attendance_date").in("employee_id", workerIds).order("attendance_date", { ascending: true }).limit(1),
        supabase.from("flexible_work_entries").select("work_date").in("employee_id", workerIds).order("work_date", { ascending: true }).limit(1)
    ]);
    if (attendanceResult.error) throw attendanceResult.error;
    if (flexibleResult.error) throw flexibleResult.error;
    const firstWorkedDate = [attendanceResult.data?.[0]?.attendance_date, flexibleResult.data?.[0]?.work_date].filter(Boolean).sort()[0];
    if (!firstWorkedDate) return { last_calculated_period: null, suggested_period: null, message: "Record attendance or flexible work before calculating the first payroll." };
    return {
        last_calculated_period: null,
        suggested_period: { start_date: firstWorkedDate, end_date: addCalendarDays(firstWorkedDate, 13) },
        message: `No prior payroll exists. The first recorded work date is ${firstWorkedDate}; use this 14-day period when it is complete.`
    };
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
                daily_rate,
                company_id
            ),
            payments(payment_status, failure_reason, payment_date, created_at)
        `)
        .order("generated_at", {
            ascending: false
        });

    query = scopeByRelatedCompany(query, user);
    query = scopeByManager(query, user, "employees.manager_user_id");

    const { data, error } = await query;

    if (error)
        throw error;

    return (data || []).map((payroll) => {
        const failedPayment = (payroll.payments || [])
            .filter((payment) => String(payment.payment_status || "").startsWith("FAILED"))
            .sort((a, b) => String(b.payment_date || b.created_at || "").localeCompare(String(a.payment_date || a.created_at || "")))[0];
        return { ...payroll, failure_reason: failedPayment?.failure_reason || null, payments: undefined };
    });

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
    query = scopeByManager(query, user, "employees.manager_user_id");

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
    generatePayrollForAll,
    getPayrollDateGuidance,
    getPayrolls,
    getPayrollSummary,
    getPayrollById,
    deletePayroll
};
