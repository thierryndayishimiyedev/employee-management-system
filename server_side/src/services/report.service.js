const supabase = require("../config/supabase");
const { isSuperAdmin, resolveAuthorizedCompanyId, scopeByCompany } = require("../utils/companyScope");

const buildDailySnapshot = async (companyId, reportDate) => {
    const [attendanceResult, productionResult, advancesResult, payrollResult] = await Promise.all([
        supabase.from("attendance").select("attendance_status,hours_worked,overtime_hours").eq("company_id", companyId).eq("attendance_date", reportDate),
        supabase.from("production_records").select("quantity,unit,unit_price,mineral_type,production_expenses(amount)").eq("production_date", reportDate).in("employee_id", (await supabase.from("employees").select("employee_id").eq("company_id", companyId)).data?.map(e => e.employee_id) || []),
        supabase.from("salary_advances").select("amount,status,employees!inner(company_id)").eq("request_date", reportDate).eq("employees.company_id", companyId),
        supabase.from("payroll").select("net_salary,advance_deduction,employees!inner(company_id)").eq("employees.company_id", companyId)
    ]);
    if (attendanceResult.error || productionResult.error || advancesResult.error || payrollResult.error) throw new Error("Unable to build report from recorded activities.");
    const attendance = attendanceResult.data || [];
    const production = productionResult.data || [];
    const gross = production.reduce((sum, p) => p.unit_price == null ? sum : sum + Number(p.quantity || 0) * Number(p.unit_price), 0);
    const expenses = production.reduce((sum, p) => sum + (p.production_expenses || []).reduce((v, x) => v + Number(x.amount || 0), 0), 0);
    return {
        attendance_summary: { records: attendance.length, present: attendance.filter(a => a.attendance_status === "PRESENT").length, absent: attendance.filter(a => a.attendance_status === "ABSENT").length, late: attendance.filter(a => a.attendance_status === "LATE").length, hours: attendance.reduce((s, a) => s + Number(a.hours_worked || 0), 0), overtime: attendance.reduce((s, a) => s + Number(a.overtime_hours || 0), 0) },
        production_summary: { records: production.length, minerals: production.map(p => ({ mineral_type: p.mineral_type, quantity: p.quantity, unit: p.unit, unit_price: p.unit_price })), gross_value: gross, expenses, net_result: gross - expenses },
        advances_summary: { count: (advancesResult.data || []).length, total: (advancesResult.data || []).reduce((s, a) => s + Number(a.amount || 0), 0) },
        payroll_summary: { count: (payrollResult.data || []).length, net_salary: (payrollResult.data || []).reduce((s, p) => s + Number(p.net_salary || 0), 0), advance_deduction: (payrollResult.data || []).reduce((s, p) => s + Number(p.advance_deduction || 0), 0) }
    };
};

const createReport = async (reportData, user) => {

    const {
        report_date,
        title,
        report_content
    } = reportData;
    const scopedCompanyId = resolveAuthorizedCompanyId(user, reportData.company_id);
    const snapshot = await buildDailySnapshot(scopedCompanyId, report_date);

    const { data, error } = await supabase
        .from("reports")
        .insert([{
            company_id: scopedCompanyId,
            accountant_id: user.employee_id,
            report_date,
            title,
            report_content
            , attendance_summary: snapshot.attendance_summary,
            production_summary: snapshot.production_summary,
            advances_summary: snapshot.advances_summary,
            daily_summary: snapshot.payroll_summary,
            created_by: user.user_id || null
        }])
        .select()
        .single();

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

    await getReportById(id, user);

    const { data, error } = await supabase
        .from("reports")
        .update({
            is_read: true
        })
        .eq("report_id", id)
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
    const snapshot = await buildDailySnapshot(report.company_id, report.report_date);

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
            daily_summary: snapshot.payroll_summary
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

    const { data, error } = await supabase.from("reports").update(update).eq("report_id", id).select().single();
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
