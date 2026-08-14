const supabase = require("../config/supabase");
const { createPdfBuffer } = require("../utils/pdfBuilder");
const { isSuperAdmin, requireCompanyId, requireCompanyIds, scopeByCompany, scopeByRelatedCompany } = require("../utils/companyScope");

const systemName = "C.M.K Gatsibo Mining Operations";

const nameOf = (employee) => [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") || "-";

const getCompany = async (user) => {
    if (isSuperAdmin(user)) {
        return {
            company_name: "All Companies",
            address: "Global system report",
            phone: "-",
            email: "-"
        };
    }

    const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("company_id", requireCompanyId(user))
        .maybeSingle();

    if (error) throw error;
    return data || {};
};

const generatedBy = (user) => user?.username || user?.role_name || "System User";
const parseReportSummary = (value) => {
    if (!value) return {};
    if (typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return {}; }
};

const dateRange = (query = {}) => {
    const today = new Date();
    const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const toIso = (date) => date.toISOString().split("T")[0];
    const period = query.period || "today";

    if (query.start_date && query.end_date) {
        return { start: query.start_date, end: query.end_date, label: "Custom Range" };
    }

    if (period === "yesterday") {
        const y = startOfDay(today);
        y.setDate(y.getDate() - 1);
        return { start: toIso(y), end: toIso(y), label: "Yesterday" };
    }

    if (period === "week") {
        const start = startOfDay(today);
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { start: toIso(start), end: toIso(end), label: "Weekly" };
    }

    if (period === "month") {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: toIso(start), end: toIso(today), label: "Monthly" };
    }

    if (period === "year") {
        const start = new Date(today.getFullYear(), 0, 1);
        return { start: toIso(start), end: toIso(today), label: "Yearly" };
    }

    return { start: toIso(today), end: toIso(today), label: "Daily" };
};

const sendPdf = (res, filename, buffer) => {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.send(buffer);
};

const attendancePdf = async (user, query) => {
    const company = await getCompany(user);
    const range = dateRange(query);
    let request = supabase
        .from("attendance")
        .select(`
            *,
            employees(
                employee_code,
                first_name,
                last_name,
                departments(department_name),
                positions(position_name)
            )
        `)
        .gte("attendance_date", range.start)
        .lte("attendance_date", range.end)
        .order("attendance_date", { ascending: true });

    request = scopeByCompany(request, user);
    const { data, error } = await request;
    if (error) throw error;

    const rows = (data || []).map((record) => ({
        code: record.employees?.employee_code,
        employee: nameOf(record.employees),
        department: record.employees?.departments?.department_name,
        position: record.employees?.positions?.position_name,
        check_in: record.check_in || "-",
        check_out: record.check_out || "-",
        hours: record.hours_worked || 0,
        overtime: record.overtime_hours || 0,
        status: record.attendance_status,
        remarks: record.remarks || "-"
    }));

    const count = (status) => rows.filter((row) => row.status === status).length;

    return createPdfBuffer({
        title: `${range.label} Attendance Report`,
        reportNumber: `ATT-${Date.now()}`,
        company,
        generatedBy: generatedBy(user),
        summary: [
            { label: "Period", value: `${range.start} to ${range.end}` },
            { label: "Total Records", value: rows.length },
            { label: "Present", value: count("PRESENT") },
            { label: "Absent", value: count("ABSENT") },
            { label: "Late", value: count("LATE") },
            { label: "Leave", value: count("LEAVE") }
        ],
        columns: [
            { key: "code", label: "Code", width: 10 },
            { key: "employee", label: "Employee", width: 18 },
            { key: "department", label: "Department", width: 14 },
            { key: "position", label: "Position", width: 14 },
            { key: "check_in", label: "In", width: 8 },
            { key: "check_out", label: "Out", width: 8 },
            { key: "hours", label: "Hrs", width: 5 },
            { key: "overtime", label: "OT", width: 5 },
            { key: "status", label: "Status", width: 10 }
        ],
        rows
    });
};

const productionPdf = async (user, query) => {
    const company = await getCompany(user);
    const range = dateRange(query);
    let request = supabase
        .from("production_records")
        .select(`
            *,
            employees!inner(
                employee_code,
                first_name,
                last_name,
                company_id,
                departments(department_name)
            )
        `)
        .gte("production_date", range.start)
        .lte("production_date", range.end)
        .order("production_date", { ascending: true });

    request = scopeByRelatedCompany(request, user);
    const { data, error } = await request;
    if (error) throw error;

    const rows = (data || []).map((record) => ({
        department: record.employees?.departments?.department_name,
        worker: nameOf(record.employees),
        mineral: record.mineral_type || "-",
        quantity: record.quantity || 0,
        unit: record.unit || "-",
        remarks: record.remarks || "-"
    }));

    return createPdfBuffer({
        title: `${range.label} Production Report`,
        reportNumber: `PROD-${Date.now()}`,
        company,
        generatedBy: generatedBy(user),
        summary: [
            { label: "Period", value: `${range.start} to ${range.end}` },
            { label: "Production Records", value: rows.length },
            { label: "Total Quantity", value: rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0) }
        ],
        columns: [
            { key: "department", label: "Department", width: 16 },
            { key: "worker", label: "Worker", width: 20 },
            { key: "mineral", label: "Production", width: 16 },
            { key: "quantity", label: "Qty", width: 10 },
            { key: "unit", label: "Unit", width: 8 },
            { key: "remarks", label: "Remarks", width: 24 }
        ],
        rows
    });
};

const payrollPdf = async (user, query) => {
    const company = await getCompany(user);
    const range = dateRange(query);
    let request = supabase
        .from("payroll")
        .select(`
            *,
            employees!inner(
                first_name,
                last_name,
                company_id,
                positions(position_name)
            )
        `)
        .order("generated_at", { ascending: false });

    request = scopeByRelatedCompany(request, user);
    if (query.payroll_period_start && query.payroll_period_end) {
        request = request
            .eq("payroll_frequency", "BIWEEKLY")
            .eq("payroll_period_start", query.payroll_period_start)
            .eq("payroll_period_end", query.payroll_period_end);
    }
    const { data, error } = await request;
    if (error) throw error;

    const rows = (data || []).map((record) => ({
        employee: nameOf(record.employees),
        period: record.payroll_frequency === "BIWEEKLY"
            ? `${record.payroll_period_start} to ${record.payroll_period_end}`
            : `${record.payroll_month}/${record.payroll_year}`,
        position: record.employees?.positions?.position_name,
        basic: record.basic_salary || 0,
        overtime: record.overtime_pay || 0,
        advances: record.advance_deduction || 0,
        deductions: record.deductions || 0,
        net: record.net_salary || 0,
        status: record.payment_status || "-"
    }));

    return createPdfBuffer({
        title: `${range.label} Payroll Report`,
        reportNumber: `PAYROLL-${Date.now()}`,
        company,
        generatedBy: generatedBy(user),
        summary: [
            { label: "Period Filter", value: `${range.start} to ${range.end}` },
            ...(query.payroll_period_start && query.payroll_period_end
                ? [{ label: "Biweekly Payroll Period", value: `${query.payroll_period_start} to ${query.payroll_period_end}` }]
                : []),
            { label: "Payroll Records", value: rows.length },
            { label: "Total Net Salary", value: rows.reduce((sum, row) => sum + Number(row.net || 0), 0) }
        ],
        columns: [
            { key: "employee", label: "Employee", width: 16 },
            { key: "period", label: "Payroll Period", width: 26 },
            { key: "position", label: "Position", width: 10 },
            { key: "basic", label: "Basic", width: 9 },
            { key: "overtime", label: "Overtime", width: 9 },
            { key: "advances", label: "Advances", width: 9 },
            { key: "net", label: "Net", width: 9 },
            { key: "status", label: "Status", width: 10 }
        ],
        rows
    });
};

const paymentPdf = async (user, query) => {
    const company = await getCompany(user);
    const range = dateRange(query);
    let request = supabase
        .from("payments")
        .select(`
            *,
            employees!inner(first_name,last_name,company_id)
        `)
        .order("payment_date", { ascending: false });

    request = scopeByRelatedCompany(request, user);
    const { data, error } = await request;
    if (error) throw error;

    const rows = (data || []).map((record) => ({
        employee: nameOf(record.employees),
        phone: record.receiver_phone || record.phone || "-",
        beneficiary: record.receiver_name || record.beneficiary_name || "-",
        amount: record.amount || 0,
        method: record.payment_method || "-",
        reference: record.reference_id || record.transaction_reference || "-",
        status: record.payment_status || "-",
        reason: record.failure_reason || "-"
    }));

    return createPdfBuffer({
        title: `${range.label} Payment Report`,
        reportNumber: `PMT-${Date.now()}`,
        company,
        generatedBy: generatedBy(user),
        summary: [
            { label: "Period Filter", value: `${range.start} to ${range.end}` },
            { label: "Payments", value: rows.length },
            { label: "Total Amount", value: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0) }
        ],
        columns: [
            { key: "employee", label: "Employee", width: 18 },
            { key: "phone", label: "Phone", width: 14 },
            { key: "beneficiary", label: "Beneficiary", width: 18 },
            { key: "amount", label: "Amount", width: 10 },
            { key: "method", label: "Method", width: 14 },
            { key: "reference", label: "Reference", width: 18 },
            { key: "status", label: "Status", width: 12 }
        ],
        rows
    });
};

const advancesPdf = async (user, query) => {
    const company = await getCompany(user);
    const range = dateRange(query);
    let request = supabase
        .from("salary_advances")
        .select(`
            *,
            employees!inner(first_name,last_name,employee_code,company_id)
        `)
        .order("created_at", { ascending: false });

    request = scopeByRelatedCompany(request, user);
    const { data, error } = await request;
    if (error) throw error;

    const rows = (data || []).map((record) => ({
        employee: nameOf(record.employees),
        code: record.employees?.employee_code || "-",
        amount: record.amount || 0,
        reason: record.reason || "-",
        status: record.status || "-",
        approval: record.approval_date || "-"
    }));

    return createPdfBuffer({
        title: `${range.label} Salary Advances Report`,
        reportNumber: `ADV-${Date.now()}`,
        company,
        generatedBy: generatedBy(user),
        summary: [
            { label: "Period Filter", value: `${range.start} to ${range.end}` },
            { label: "Advance Records", value: rows.length },
            { label: "Total Amount", value: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0) }
        ],
        columns: [
            { key: "code", label: "Code", width: 12 },
            { key: "employee", label: "Employee", width: 20 },
            { key: "amount", label: "Amount", width: 12 },
            { key: "reason", label: "Reason", width: 24 },
            { key: "status", label: "Status", width: 12 },
            { key: "approval", label: "Approval", width: 12 }
        ],
        rows
    });
};

const simpleEmployeePdf = async (user, query, type) => {
    const company = await getCompany(user);
    const table = type === "departments" ? "departments" : type === "positions" ? "positions" : "employees";
    let request = supabase.from(table);

    if (type === "positions") {
        request = request
            .select("*, departments!inner(company_id, department_name)")
            .order("created_at", { ascending: false });
        if (!isSuperAdmin(user)) request = request.in("departments.company_id", requireCompanyIds(user));
    } else {
        request = request
            .select("*")
            .order("created_at", { ascending: false });
        request = scopeByCompany(request, user);
    }

    const { data, error } = await request;
    if (error) throw error;

    const rows = (data || []).map((record) => ({
        name: record.first_name ? nameOf(record) : record.department_name || record.position_name || "-",
        code: record.employee_code || record.position_id || record.department_id || "-",
        status: record.status || "ACTIVE",
        phone: record.phone || "-",
        email: record.email || "-"
    }));

    return createPdfBuffer({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
        reportNumber: `LIST-${Date.now()}`,
        company,
        generatedBy: generatedBy(user),
        summary: [
            { label: "Records", value: rows.length },
            { label: "System", value: systemName }
        ],
        columns: [
            { key: "code", label: "Code/ID", width: 16 },
            { key: "name", label: "Name", width: 28 },
            { key: "status", label: "Status", width: 12 },
            { key: "phone", label: "Phone", width: 14 },
            { key: "email", label: "Email", width: 22 }
        ],
        rows
    });
};

const dailyReportsPdf = async (user, query) => {
    const company = await getCompany(user);
    const range = dateRange(query);
    let request = supabase
        .from("reports")
        .select("*, employees(first_name,last_name)")
        .gte("report_date", range.start)
        .lte("report_date", range.end)
        .order("report_date", { ascending: false });

    request = scopeByCompany(request, user);
    if (user?.role_name === "ACCOUNTANT") request = request.eq("accountant_id", user.employee_id);

    const { data, error } = await request;
    if (error) throw error;

    const rows = (data || []).map((record) => {
        const summary = parseReportSummary(record.daily_summary);
        return ({
        period: record.report_type && record.period_start && record.period_end
            ? `${record.report_type}: ${record.period_start} to ${record.period_end}`
            : summary.report_period
            ? `${summary.report_period.type}: ${summary.report_period.start} to ${summary.report_period.end}`
            : record.report_date,
        prepared: nameOf(record.employees),
        attendance: `${record.attendance_summary?.present || 0} present / ${record.attendance_summary?.hours || 0} hrs`,
        production: record.production_summary?.gross_value || 0,
        expenses: record.production_summary?.expenses || 0,
        result: record.production_summary?.net_result || 0,
        advances: record.advances_summary?.total || 0,
        payroll: summary.payroll_summary?.net_salary || 0,
        status: record.status || (record.is_submitted ? "Submitted" : "Draft")
    }); });

    return createPdfBuffer({
        title: `${range.label} Daily Reports`,
        reportNumber: `DR-${Date.now()}`,
        company,
        generatedBy: generatedBy(user),
        preparedBy: rows[0]?.prepared,
        summary: [
            { label: "Period", value: `${range.start} to ${range.end}` },
            { label: "Reports", value: rows.length },
            { label: "Pending Manager", value: rows.filter((row) => row.status === "PENDING_MANAGER").length },
            { label: "Pending Owner", value: rows.filter((row) => row.status === "PENDING_OWNER").length },
            { label: "Final Approved", value: rows.filter((row) => row.status === "APPROVED").length }
        ],
        columns: [
            { key: "period", label: "Report Period", width: 22 },
            { key: "prepared", label: "Prepared By", width: 14 },
            { key: "attendance", label: "Attendance", width: 15 },
            { key: "production", label: "Gross Value", width: 11 },
            { key: "expenses", label: "Expenses", width: 10 },
            { key: "result", label: "Net Result", width: 11 },
            { key: "advances", label: "Advances", width: 10 },
            { key: "payroll", label: "Payroll", width: 10 },
            { key: "status", label: "Status", width: 12 }
        ],
        rows
    });
};

const buildReportPdf = async (type, user, query) => {
    if (type === "attendance") return attendancePdf(user, query);
    if (type === "production") return productionPdf(user, query);
    if (type === "payroll") return payrollPdf(user, query);
    if (type === "payments") return paymentPdf(user, query);
    if (type === "advances") return advancesPdf(user, query);
    if (type === "employees" || type === "departments" || type === "positions") return simpleEmployeePdf(user, query, type);
    if (type === "reports") return dailyReportsPdf(user, query);
    throw new Error("Unsupported report type.");
};

module.exports = {
    buildReportPdf,
    sendPdf
};
