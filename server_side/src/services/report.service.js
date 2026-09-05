const supabase = require("../config/supabase");
const { isSuperAdmin, resolveAuthorizedCompanyId, scopeByCompany } = require("../utils/companyScope");
const { requireManagerUserId, scopeByManager } = require("../utils/managerScope");

const parseDailySummary = (value) => {
    if (!value) return {};
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return {}; }
};

const resolvePeriod = ({ report_date, report_type = "DAILY" }) => {
    if (!report_date || Number.isNaN(Date.parse(`${report_date}T00:00:00Z`))) throw new Error("A valid report date is required.");
    const type = String(report_type).toUpperCase();
    if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(type)) throw new Error("Report type must be DAILY, WEEKLY, MONTHLY, or YEARLY.");
    const date = new Date(`${report_date}T00:00:00Z`); let start = new Date(date); let end = new Date(date);
    if (type === "WEEKLY") { const offset = (date.getUTCDay() + 6) % 7; start.setUTCDate(date.getUTCDate() - offset); end = new Date(start); end.setUTCDate(start.getUTCDate() + 6); }
    if (type === "MONTHLY") { start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)); end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)); }
    if (type === "YEARLY") { start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1)); end = new Date(Date.UTC(date.getUTCFullYear(), 11, 31)); }
    return { type, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
};

const buildActivitySnapshot = async (companyId, period, managerUserId) => {
    const withinManagerScope = (query) => managerUserId
        ? query.eq("manager_user_id", managerUserId)
        : query;
    const [employeeResult, attendanceResult, productionResult, advancesResult, payrollResult, consumptionResult, foodResult, expenseResult] = await Promise.all([
        withinManagerScope(supabase.from("employees").select("employee_id", { count: "exact", head: true }).eq("company_id", companyId)),
        withinManagerScope(supabase.from("attendance").select("attendance_date,attendance_status,check_in,check_out,hours_worked,overtime_hours,remarks,employees!inner(employee_code,first_name,last_name,company_id)").eq("employees.company_id", companyId).gte("attendance_date", period.start).lte("attendance_date", period.end)),
        withinManagerScope(supabase.from("production_records").select("production_date,quantity,unit,mineral_type,working_hours,activity_details,remarks,employees!inner(employee_code,first_name,last_name,company_id)").eq("employees.company_id", companyId).gte("production_date", period.start).lte("production_date", period.end)),
        withinManagerScope(supabase.from("salary_advances").select("request_date,amount,amount_paid,remaining_balance,reason,status,payment_status,employees!inner(employee_code,first_name,last_name,company_id)").eq("employees.company_id", companyId).gte("request_date", period.start).lte("request_date", period.end)),
        withinManagerScope(supabase.from("payroll").select("payroll_period_start,payroll_period_end,days_worked,basic_salary,advance_deduction,consumption_deduction,net_salary,payment_status,approval_status,employees!inner(employee_code,first_name,last_name,company_id)").eq("employees.company_id", companyId).gte("generated_at", `${period.start}T00:00:00Z`).lte("generated_at", `${period.end}T23:59:59Z`)),
        withinManagerScope(supabase.from("worker_consumptions").select("consumption_date,item_name,quantity,total_amount,amount_deducted,remaining_balance,approval_status,shopkeeper_payment_status,employees!inner(employee_code,first_name,last_name,company_id),shopkeepers(shopkeeper_name)").eq("company_id", companyId).gte("consumption_date", period.start).lte("consumption_date", period.end)),
        withinManagerScope(supabase.from("food_supplies").select("supply_date,status,payment_status,food_suppliers(supplier_name),food_supply_items(food_name,quantity,unit,unit_price)").eq("company_id", companyId).gte("supply_date", period.start).lte("supply_date", period.end)),
        withinManagerScope(supabase.from("operational_expenses").select("expense_date,expense_category,item_name,quantity,unit,unit_price,total_amount,buyer_name,buyer_phone,approval_status,payment_status").eq("company_id", companyId).gte("expense_date", period.start).lte("expense_date", period.end))
    ]);
    if ([attendanceResult, productionResult, advancesResult, payrollResult, consumptionResult, foodResult, expenseResult].some((result) => result.error)) throw new Error("Unable to build report from recorded activities. Run all required database migrations first.");
    const attendance = attendanceResult.data || [];
    const production = productionResult.data || [];
    const gross = 0;
    const expenses = (expenseResult.data || []).reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    return {
        period,
        attendance_summary: { total_workers: employeeResult.count || 0, records: attendance.length, present: attendance.filter(a => a.attendance_status === "PRESENT").length, absent: attendance.filter(a => a.attendance_status === "ABSENT").length, hours: attendance.reduce((s, a) => s + Number(a.hours_worked || 0), 0), overtime: attendance.reduce((s, a) => s + Number(a.overtime_hours || 0), 0) },
        production_summary: { records: production.length, minerals: production.map(p => ({ mineral_type: p.mineral_type, quantity: p.quantity, unit: p.unit })), gross_value: gross, expenses, net_result: gross - expenses },
        advances_summary: { count: (advancesResult.data || []).length, total: (advancesResult.data || []).reduce((s, a) => s + Number(a.amount || 0), 0), paid: (advancesResult.data || []).filter((a) => a.payment_status === "PAID").reduce((s, a) => s + Number(a.amount || 0), 0) },
        payroll_summary: { count: (payrollResult.data || []).length, net_salary: (payrollResult.data || []).reduce((s, p) => s + Number(p.net_salary || 0), 0), advance_deduction: (payrollResult.data || []).reduce((s, p) => s + Number(p.advance_deduction || 0), 0), consumption_deduction: (payrollResult.data || []).reduce((s, p) => s + Number(p.consumption_deduction || 0), 0) },
        worker_consumptions: { total: (consumptionResult.data || []).reduce((s, c) => s + Number(c.total_amount || 0), 0), deducted: (consumptionResult.data || []).reduce((s, c) => s + Number(c.amount_deducted || 0), 0), outstanding: (consumptionResult.data || []).reduce((s, c) => s + Number(c.remaining_balance || 0), 0) },
        food_supplies: { count: (foodResult.data || []).length, total: (foodResult.data || []).reduce((sum, supply) => sum + (supply.food_supply_items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0), 0), paid: (foodResult.data || []).filter((s) => s.payment_status === "PAID").length },
        expenses: { count: (expenseResult.data || []).length, total: expenses, paid: (expenseResult.data || []).filter((item) => item.payment_status === "PAID").reduce((sum, item) => sum + Number(item.total_amount || 0), 0) },
        activity_rows: { attendance: attendanceResult.data || [], production: productionResult.data || [], advances: advancesResult.data || [], payroll: payrollResult.data || [], worker_consumptions: consumptionResult.data || [], food_supplies: foodResult.data || [], expenses: expenseResult.data || [] }
    };
};

const createReport = async (reportData, user) => {

    const {
        report_date,
        report_type
    } = reportData;
    const scopedCompanyId = resolveAuthorizedCompanyId(user, reportData.company_id);
    const manager_user_id = user?.role_name === "ACCOUNTANT" ? requireManagerUserId(user) : reportData.manager_user_id;
    if (!manager_user_id) throw new Error("A manager must be selected for this report.");
    const period = resolvePeriod({ report_date, report_type });
    const snapshot = await buildActivitySnapshot(scopedCompanyId, period, manager_user_id);

    const { data, error } = await supabase
        .from("reports")
        .insert([{
            company_id: scopedCompanyId,
            manager_user_id,
            accountant_id: user.employee_id,
            report_date: period.end,
            report_type: period.type,
            period_start: period.start,
            period_end: period.end,
            snapshot_generated_at: new Date().toISOString(),
            title: `${period.type.charAt(0)}${period.type.slice(1).toLowerCase()} Operations Report (${period.start} to ${period.end})`,
            report_content: "Automatically generated from recorded company activities. No manual narrative is required.",
            attendance_summary: snapshot.attendance_summary,
            production_summary: snapshot.production_summary,
            advances_summary: snapshot.advances_summary,
            daily_summary: { report_period: period, payroll_summary: snapshot.payroll_summary, worker_consumptions: snapshot.worker_consumptions, food_supplies: snapshot.food_supplies, expenses: snapshot.expenses, activity_rows: snapshot.activity_rows },
            created_by: user.user_id || null
        }])
        .select()
        .single();

    if (error?.code === "23505") {
        throw new Error("A report already exists for this company, accountant, type, and period.");
    }
    if (error)
        throw error;

    return data;

};

const scopedReportQuery = (user) => {
    let query = supabase
        .from("reports")
        .select(`
            *,
            employees(
                first_name,
                last_name
            )
        `);

    // Scope against all JWT-authorized companies.  This is essential for owners
    // who legitimately have more than one assignment, and never trusts a UI id.
    query = scopeByCompany(query, user);
    query = scopeByManager(query, user);

    if (user?.role_name === "ACCOUNTANT") {
        query = query.eq("accountant_id", user.employee_id);
    }

    return query;
};

const getReports = async (user) => {

    const { data, error } = await scopedReportQuery(user)
        .order("created_at", {
            ascending: false
        });

    if (error)
        throw error;

    return data;

};

const getReportById = async (id, user) => {

    const { data, error } = await scopedReportQuery(user)
        .eq("report_id", id)
        .single();

    if (error)
        throw error;

    return data;

};

const markReportAsRead = async (id, user) => {

    const report = await getReportById(id, user);

    const { data, error } = await supabase
        .from("reports")
        .update({
            is_read: true
        })
        .eq("report_id", id)
        .eq("manager_user_id", report.manager_user_id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const submitReport = async (id, user) => {

    const report = await getReportById(id, user);

    if (user?.role_name === "ACCOUNTANT" && report.accountant_id !== user.employee_id)
        throw new Error("Forbidden: report belongs to another accountant.");
    if (!["DRAFT", "CHANGES_REQUESTED"].includes(report.status || "DRAFT")) {
        throw new Error("Only a draft or correction-requested report can be submitted.");
    }
    const period = parseDailySummary(report.daily_summary).report_period || resolvePeriod({ report_date: report.report_date, report_type: "DAILY" });
    const snapshot = await buildActivitySnapshot(report.company_id, period, report.manager_user_id);

    const { data, error } = await supabase
        .from("reports")
        .update({
            is_submitted: true,
            is_read: false,
            is_locked: true,
            status: "PENDING_MANAGER",
            attendance_summary: snapshot.attendance_summary,
            production_summary: snapshot.production_summary,
            advances_summary: snapshot.advances_summary,
            daily_summary: { report_period: period, payroll_summary: snapshot.payroll_summary, worker_consumptions: snapshot.worker_consumptions, food_supplies: snapshot.food_supplies, expenses: snapshot.expenses, activity_rows: snapshot.activity_rows },
            report_type: period.type,
            period_start: period.start,
            period_end: period.end,
            snapshot_generated_at: new Date().toISOString()
        })
        .eq("report_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const approveReportEdit = async (id, user) => {

    await getReportById(id, user);

    const { data, error } = await supabase
        .from("reports")
        .update({
            owner_edit_approved: true
        })
        .eq("report_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const updateReport = async (id, reportData, user) => {

    const {
        title,
        report_content
    } = reportData;

    const existing = await getReportById(id, user);

    if (user?.role_name === "ACCOUNTANT" && existing.accountant_id !== user.employee_id) {
        throw new Error("Forbidden: report belongs to another accountant.");
    }

    if (existing.is_locked && !["CHANGES_REQUESTED", "DRAFT"].includes(existing.status)) {

        throw new Error(
            "Owner approval required to edit submitted report."
        );

    }

    const { data, error } = await supabase
        .from("reports")
        .update({
            title,
            report_content,
            owner_edit_approved: false,
            is_locked: false,
            is_submitted: false,
            status: "DRAFT"
        })
        .eq("report_id", id)
        .select()
        .single();

    if (error)
        throw error;

    return data;

};

const reviewReport = async (id, decision, comments, user) => {
    const report = await getReportById(id, user);
    const now = new Date().toISOString();
    const role = user?.role_name;
    let update;

    if (role === "MANAGER") {
        if (report.status !== "PENDING_MANAGER") throw new Error("Report is not awaiting manager review.");
        update = decision === "approve"
            ? { status: "PENDING_OWNER", is_locked: true, manager_reviewed_by: user.user_id, manager_reviewed_at: now, manager_decision_reason: comments || null }
            : { status: "CHANGES_REQUESTED", is_locked: false, manager_reviewed_by: user.user_id, manager_reviewed_at: now, manager_decision_reason: comments || null };
    } else if (role === "OWNER") {
        if (report.status !== "PENDING_OWNER") throw new Error("Report is not awaiting owner review.");
        update = decision === "approve"
            ? { status: "APPROVED", is_locked: true, locked_at: now, owner_reviewed_by: user.user_id, owner_reviewed_at: now, owner_decision_reason: comments || null }
            : { status: "CHANGES_REQUESTED", is_locked: false, owner_reviewed_by: user.user_id, owner_reviewed_at: now, owner_decision_reason: comments || null };
    } else {
        throw new Error("Only a manager or owner can review a report.");
    }

    let updateQuery = supabase.from("reports").update(update).eq("report_id", id);
    updateQuery = scopeByManager(updateQuery, user);
    const { data, error } = await updateQuery.select().single();
    if (error) throw error;
    return data;
};

module.exports = {
    createReport,
    getReports,
    getReportById,
    markReportAsRead,
    submitReport,
    approveReportEdit,
    updateReport,
    reviewReport
};
