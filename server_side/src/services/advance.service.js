const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyId } = require("../utils/companyScope");

const WORKED_STATUSES = ["PRESENT"];
const FIRST_WEEK_WORK_DAYS = 6;

const getFirstWeekEarnings = async (employeeId, dailyRate) => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const { data: attendance, error } = await supabase
        .from("attendance")
        .select("attendance_status, overtime_hours, attendance_date")
        .eq("employee_id", employeeId)
        .gte("attendance_date", weekStart.toISOString().slice(0, 10))
        .lte("attendance_date", today.toISOString().slice(0, 10));
    if (error) throw error;
    // A first-week advance is based on the first six actually worked days.
    // This makes a 3,000 RWF/day worker eligible for 9,000 RWF after six
    // days (18,000 / 2), regardless of absences in the calendar week.
    const workedDays = (attendance || [])
        .filter((item) => WORKED_STATUSES.includes(item.attendance_status))
        .sort((a, b) => String(a.attendance_date).localeCompare(String(b.attendance_date)))
        .slice(0, FIRST_WEEK_WORK_DAYS);
    const earned_amount = workedDays.reduce((sum, item) => (
        sum + Number(dailyRate) + (Number(item.overtime_hours || 0) * (Number(dailyRate) / 8))
    ), 0);
    return {
        worked_days: workedDays.length,
        earned_amount,
        allowed_advance: earned_amount / 2
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
        .select("employee_id, company_id")
        .eq("employee_id", employee_id);

    if (!isSuperAdmin(user)) {
        employeeQuery = employeeQuery.eq("company_id", requireCompanyId(user));
    }

    const { data: employee, error: employeeError } = await employeeQuery.single();

    if (employeeError || !employee)
        throw new Error("Employee not found for your company.");

    const { data: employeeRate, error: rateError } = await supabase
        .from("employees")
        .select("daily_rate, hire_date")
        .eq("employee_id", employee_id)
        .single();
    if (rateError || Number(employeeRate.daily_rate || 0) <= 0) throw new Error("Worker must have a valid daily rate before requesting an advance.");

    const eligibility = await getFirstWeekEarnings(employee_id, employeeRate.daily_rate);
    if (eligibility.worked_days < FIRST_WEEK_WORK_DAYS) throw new Error("An advance becomes available after six recorded worked days.");

    const { data: advances } = await supabase
        .from("salary_advances")
        .select("amount")
        .eq("employee_id", employee_id)
        .in("status", ["PENDING_MANAGER", "PENDING_OWNER", "CHANGES_REQUESTED", "OWNER_APPROVED"]);

    const taken = advances.reduce(
        (sum, a) => sum + Number(a.amount),
        0
    );

    const maxAdvance = eligibility.allowed_advance;

    if (taken + Number(amount) > maxAdvance)
        throw new Error(`Advance exceeds the allowed half of first-week earnings (${maxAdvance}).`);

    const { data: advance, error: advanceError } = await supabase
        .from("salary_advances")
        .insert([{
            employee_id,
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
    let employeeQuery = supabase.from("employees").select("employee_id, company_id, daily_rate").eq("employee_id", employeeId);
    if (!isSuperAdmin(user)) employeeQuery = employeeQuery.eq("company_id", requireCompanyId(user));
    const { data: employee, error } = await employeeQuery.single();
    if (error || !employee) throw new Error("Employee not found for your company.");
    if (Number(employee.daily_rate || 0) <= 0) throw new Error("Worker must have a valid daily rate before requesting an advance.");
    const eligibility = await getFirstWeekEarnings(employeeId, employee.daily_rate);
    const { data: advances, error: advancesError } = await supabase.from("salary_advances")
        .select("amount")
        .eq("employee_id", employeeId)
        .in("status", ["PENDING_MANAGER", "PENDING_OWNER", "CHANGES_REQUESTED", "OWNER_APPROVED"]);
    if (advancesError) throw advancesError;
    const requested_amount = (advances || []).reduce((sum, advance) => sum + Number(advance.amount || 0), 0);
    return {
        ...eligibility,
        requested_amount,
        remaining_allowed_advance: Math.max(0, eligibility.allowed_advance - requested_amount),
        eligible: eligibility.worked_days >= FIRST_WEEK_WORK_DAYS
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
