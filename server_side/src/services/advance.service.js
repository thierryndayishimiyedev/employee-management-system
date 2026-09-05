const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyId } = require("../utils/companyScope");
const { assertEmployeeManager, scopeByManager } = require("../utils/managerScope");

const WORKED_STATUSES = ["PRESENT"];
const FIRST_WEEK_WORK_DAYS = 6;

const payrollPeriodEnd = (payroll) => {
    if (payroll.payroll_period_end) return String(payroll.payroll_period_end);
    if (payroll.payroll_frequency === "MONTHLY" && payroll.payroll_year && payroll.payroll_month) {
        return new Date(Date.UTC(Number(payroll.payroll_year), Number(payroll.payroll_month), 0)).toISOString().slice(0, 10);
    }
    return null;
};

const getLastPaidThroughDate = async (employeeId) => {
    const { data, error } = await supabase
        .from("payroll")
        .select("payroll_frequency, payroll_period_end, payroll_month, payroll_year")
        .eq("employee_id", employeeId)
        .eq("payment_status", "PAID");
    if (error) throw error;
    return (data || []).map(payrollPeriodEnd).filter(Boolean).sort().at(-1) || null;
};

const getFirstWeekEarnings = async (employeeId, dailyRate, paymentType = "FIXED_DAILY") => {
    const today = new Date().toISOString().slice(0, 10);
    const paidThroughDate = await getLastPaidThroughDate(employeeId);
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
    // A paid payroll closes all attendance through its ending date. Only new
    // attendance after that date can build the next week's advance.
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
    // An advance from a completed, paid payroll cycle is historic. An advance
    // requested after the latest paid payroll belongs to this new work cycle.
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
    const requested_amount = (advances || []).reduce((sum, advance) => sum + Number(advance.amount || 0), 0);
    return {
        ...eligibility,
        requested_amount,
        remaining_allowed_advance: Math.max(0, eligibility.allowed_advance - requested_amount),
        eligible: eligibility.worked_days >= FIRST_WEEK_WORK_DAYS && requested_amount === 0,
        advance_already_requested: requested_amount > 0
    };
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
    getAdvanceEligibility,
    getAdvances,
    getAdvanceById,
    updateAdvance,
    deleteAdvance
};
