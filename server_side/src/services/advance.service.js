const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyId } = require("../utils/companyScope");
const { assertEmployeeManager, scopeByManager } = require("../utils/managerScope");

const WORKED_STATUSES = ["PRESENT", "LATE"];
const FIRST_WEEK_WORK_DAYS = 6;

const payrollPeriodEnd = (payroll) => {
    if (payroll.payroll_period_end) return String(payroll.payroll_period_end);
    if (payroll.payroll_frequency === "MONTHLY" && payroll.payroll_year && payroll.payroll_month) {
        return new Date(Date.UTC(Number(payroll.payroll_year), Number(payroll.payroll_month), 0)).toISOString().slice(0, 10);
    }
    return null;
};

// A payroll period is closed as soon as it is calculated. Waiting for the
// payment click would let the same attendance days incorrectly create another
// advance while that payroll is in approval.
const getLastCalculatedThroughDate = async (employeeId) => {
    const { data, error } = await supabase
        .from("payroll")
        .select("payroll_frequency, payroll_period_end, payroll_month, payroll_year")
        .eq("employee_id", employeeId);
    if (error) throw error;
    return (data || []).map(payrollPeriodEnd).filter(Boolean).sort().at(-1) || null;
};

const getFirstWeekEarnings = async (employeeId, dailyRate, paymentType = "FIXED_DAILY") => {
    const today = new Date().toISOString().slice(0, 10);
    const paidThroughDate = await getLastCalculatedThroughDate(employeeId);
    if (paymentType === "FLEXIBLE_DAILY") {
        let workQuery = supabase.from("flexible_work_entries").select("work_date,agreed_daily_rate").eq("employee_id", employeeId).is("payroll_id", null).lte("work_date", today).order("work_date", { ascending: true });
        if (paidThroughDate) workQuery = workQuery.gt("work_date", paidThroughDate);
        const { data, error } = await workQuery; if (error) throw error;
        const workedDays = (data || []).slice(0, FIRST_WEEK_WORK_DAYS);
        const earned_amount = workedDays.reduce((sum, item) => sum + Number(item.agreed_daily_rate || 0), 0);
        return { worked_days: workedDays.length, earned_amount, allowed_advance: earned_amount / 2, paid_through_date: paidThroughDate, cycle_start_date: workedDays[0]?.work_date || null };
    }
    let attendanceQuery = supabase
        .from("attendance")
        .select("attendance_status, overtime_hours, attendance_date")
        .eq("employee_id", employeeId)
        .lte("attendance_date", today)
        .order("attendance_date", { ascending: true });
    // A calculated payroll closes all attendance through its ending date. Only
    // new attendance after that date can build the next week's advance.
    if (paidThroughDate) attendanceQuery = attendanceQuery.gt("attendance_date", paidThroughDate);
    const { data: attendance, error } = await attendanceQuery;
    if (error) throw error;
    // The first six newly worked days of each unpaid 12-day payroll cycle
    // determine the only advance for that cycle. Sundays are absent because
    // no Sunday attendance can be recorded.
    const workedDays = (attendance || [])
        .filter((item) => WORKED_STATUSES.includes(item.attendance_status))
        .slice(0, FIRST_WEEK_WORK_DAYS);
    const earned_amount = workedDays.reduce((sum, item) => (
        sum + Number(dailyRate) + (Number(item.overtime_hours || 0) * (Number(dailyRate) / 8))
    ), 0);
    return {
        worked_days: workedDays.length,
        earned_amount,
        allowed_advance: earned_amount / 2,
        paid_through_date: paidThroughDate,
        cycle_start_date: workedDays[0]?.attendance_date || null
    };
};

const requestAdvance = async (data, user) => {

    const {
        employee_id,
        amount,
        reason
    } = data;

    const today = new Date();
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        throw new Error("Advance amount must be greater than zero.");
    }

    let employeeQuery = supabase
        .from("employees")
        .select("employee_id, company_id, manager_user_id")
        .eq("employee_id", employee_id);

    if (!isSuperAdmin(user)) {
        employeeQuery = employeeQuery.eq("company_id", requireCompanyId(user));
    }

    const { data: employee, error: employeeError } = await employeeQuery.single();

    if (employeeError || !employee)
        throw new Error("Employee not found for your company.");
    assertEmployeeManager(employee, user);
    if (!employee.manager_user_id) throw new Error("Employee is not assigned to a manager.");

    const { data: employeeRate, error: rateError } = await supabase
        .from("employees")
        .select("daily_rate, payment_type, hire_date")
        .eq("employee_id", employee_id)
        .single();
    if (rateError || (employeeRate.payment_type !== "FLEXIBLE_DAILY" && Number(employeeRate.daily_rate || 0) <= 0)) throw new Error("Worker must have a valid daily rate before requesting an advance.");

    const eligibility = await getFirstWeekEarnings(employee_id, employeeRate.daily_rate, employeeRate.payment_type);
    if (eligibility.worked_days < FIRST_WEEK_WORK_DAYS) throw new Error("An advance becomes available after six recorded worked days.");

    let advancesQuery = supabase
        .from("salary_advances")
        .select("amount, request_date")
        .eq("employee_id", employee_id)
        .in("status", ["PENDING", "PENDING_MANAGER", "PENDING_OWNER", "CHANGES_REQUESTED", "OWNER_APPROVED"]);
    // An advance from a calculated payroll cycle is historic. An advance
    // requested after the latest calculated payroll belongs to a new cycle.
    if (eligibility.paid_through_date) advancesQuery = advancesQuery.gt("request_date", eligibility.paid_through_date);
    const { data: advances, error: advancesError } = await advancesQuery;
    if (advancesError) throw advancesError;

    const taken = (advances || []).reduce(
        (sum, a) => sum + Number(a.amount),
        0
    );

    const maxAdvance = eligibility.allowed_advance;

    if (taken > 0) {
        throw new Error("An advance has already been requested for this 12-workday payroll cycle. Pay the payroll, then record six new worked days before requesting another advance.");
    }

    if (taken + Number(amount) > maxAdvance)
        throw new Error(`Advance exceeds the allowed half of first-week earnings (${maxAdvance}).`);

    const { data: advance, error: advanceError } = await supabase
        .from("salary_advances")
        .insert([{
            employee_id,
            manager_user_id: employee.manager_user_id,
            amount,
            reason,
            request_date: today,
            status: "PENDING_MANAGER",
            payment_status: "UNPAID",
            remaining_balance: amount,
            amount_paid: 0,
            amount_deducted: 0,
            deduction_status: "NOT_DEDUCTED"
        }])
        .select()
        .single();

    if (advanceError)
        throw advanceError;

    return advance;

};

const getAdvanceEligibility = async (employeeId, user) => {
    let employeeQuery = supabase.from("employees").select("employee_id, company_id, daily_rate, payment_type, manager_user_id").eq("employee_id", employeeId);
    if (!isSuperAdmin(user)) employeeQuery = employeeQuery.eq("company_id", requireCompanyId(user));
    const { data: employee, error } = await employeeQuery.single();
    if (error || !employee) throw new Error("Employee not found for your company.");
    assertEmployeeManager(employee, user);
    if (employee.payment_type !== "FLEXIBLE_DAILY" && Number(employee.daily_rate || 0) <= 0) throw new Error("Worker must have a valid daily rate before requesting an advance.");
    const eligibility = await getFirstWeekEarnings(employeeId, employee.daily_rate, employee.payment_type);
    let advancesQuery = supabase.from("salary_advances")
        .select("amount, request_date")
        .eq("employee_id", employeeId)
        .in("status", ["PENDING", "PENDING_MANAGER", "PENDING_OWNER", "CHANGES_REQUESTED", "OWNER_APPROVED"]);
    if (eligibility.paid_through_date) advancesQuery = advancesQuery.gt("request_date", eligibility.paid_through_date);
    const { data: advances, error: advancesError } = await advancesQuery;
    if (advancesError) throw advancesError;
    const { data: advanceHistory, error: historyError } = await supabase.from("salary_advances")
        .select("advance_id, amount, request_date, payment_date, status, payment_status, created_at")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(1);
    if (historyError) throw historyError;
    const requested_amount = (advances || []).reduce((sum, advance) => sum + Number(advance.amount || 0), 0);
    const advance_already_requested = requested_amount > 0;
    const worked_days_remaining = Math.max(0, FIRST_WEEK_WORK_DAYS - eligibility.worked_days);
    const next_advance = advance_already_requested
        ? { available_now: false, message: "An advance is already in this payroll cycle. The worker must receive payroll, then record six new worked days." }
        : worked_days_remaining === 0
            ? { available_now: true, message: "Available now: the first six worked days have been recorded." }
            : { available_now: false, message: `Available after ${worked_days_remaining} more recorded worked day(s).` };
    return {
        ...eligibility,
        payment_type: employee.payment_type || "FIXED_DAILY",
        last_advance: advanceHistory?.[0] || null,
        requested_amount,
        remaining_allowed_advance: Math.max(0, eligibility.allowed_advance - requested_amount),
        eligible: eligibility.worked_days >= FIRST_WEEK_WORK_DAYS && !advance_already_requested,
        advance_already_requested,
        worked_days_remaining,
        next_advance
    };
};

const requestAdvancesForAllEligibleWorkers = async (data, user) => {
    let workersQuery = supabase.from("employees")
        .select("employee_id, employee_code, first_name, last_name")
        .eq("is_worker", true)
        .eq("company_id", requireCompanyId(user))
        .order("first_name", { ascending: true });
    workersQuery = scopeByManager(workersQuery, user);
    const { data: workers, error } = await workersQuery;
    if (error) throw error;
    if (!workers?.length) throw new Error("No workers are available in your manager scope.");

    const result = { workers_considered: workers.length, requested: [], skipped: [], failed: [] };
    for (const worker of workers) {
        const employee_name = `${worker.first_name || ""} ${worker.last_name || ""}`.trim() || worker.employee_code;
        try {
            const eligibility = await getAdvanceEligibility(worker.employee_id, user);
            if (!eligibility.eligible || Number(eligibility.remaining_allowed_advance) <= 0) {
                result.skipped.push({ employee_id: worker.employee_id, employee_code: worker.employee_code, employee_name, reason: eligibility.next_advance?.message || "Not eligible for an advance yet." });
                continue;
            }
            const advance = await requestAdvance({
                employee_id: worker.employee_id,
                amount: eligibility.remaining_allowed_advance,
                reason: data?.reason?.trim() || "Automatic first-week advance based on recorded work."
            }, user);
            result.requested.push({ employee_id: worker.employee_id, employee_code: worker.employee_code, employee_name, advance_id: advance.advance_id, amount: advance.amount });
        } catch (workerError) {
            result.failed.push({ employee_id: worker.employee_id, employee_code: worker.employee_code, employee_name, reason: workerError.message || "Could not request advance." });
        }
    }
    return result;
};

const getAdvances = async (user) => {

    let query = supabase
        .from("salary_advances")
        .select(`
            *,
            employees!inner(
                employee_code,
                first_name,
                last_name,
                company_id
            )
        `)
        .order("created_at", {
            ascending: false
        });

    if (!isSuperAdmin(user)) {
        query = query.eq("employees.company_id", requireCompanyId(user));
    }
    query = scopeByManager(query, user, "employees.manager_user_id");

    const { data, error } = await query;

    if (error)
        throw error;

    return data;

};

const getAdvanceById = async (id, user) => {

    let query = supabase
        .from("salary_advances")
        .select(`
            *,
            employees!inner(
                employee_code,
                first_name,
                last_name,
                company_id
            )
        `)
        .eq("advance_id", id);

    if (!isSuperAdmin(user)) {
        query = query.eq("employees.company_id", requireCompanyId(user));
    }
    query = scopeByManager(query, user, "employees.manager_user_id");

    const { data, error } = await query.single();

    if (error)
        throw error;

    return data;

};

const updateAdvance = async (id, advanceData, user) => {

    await getAdvanceById(id, user);

    const { data, error } = await supabase
        .from("salary_advances")
        .update(advanceData)
        .eq("advance_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const deleteAdvance = async (id, user) => {

    await getAdvanceById(id, user);

    const { error } = await supabase
        .from("salary_advances")
        .delete()
        .eq("advance_id", id);

    if (error)
        throw error;

    return true;

};

module.exports = {
    requestAdvance,
    requestAdvancesForAllEligibleWorkers,
    getAdvanceEligibility,
    getAdvances,
    getAdvanceById,
    updateAdvance,
    deleteAdvance
};
