const supabase = require("../config/supabase");
const { createPdfBuffer } = require("../utils/pdfBuilder");
const { isSuperAdmin, requireCompanyId, requireCompanyIds, scopeByCompany, scopeByRelatedCompany } = require("../utils/companyScope");
const { scopeByManager } = require("../utils/managerScope");

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

const generatedBy = (user) => `${user?.role_name || "System User"} - ${user?.display_name || user?.username || "Unknown user"}`;
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
                positions(position_name)
            )
        `)
        .gte("attendance_date", range.start)
        .lte("attendance_date", range.end)
        .order("attendance_date", { ascending: true });

    request = scopeByCompany(request, user);
    request = scopeByManager(request, user);
    const { data, error } = await request;
    if (error) throw error;

    const rows = (data || []).map((record) => ({
        code: record.employees?.employee_code,
        employee: nameOf(record.employees),
        department: "-",
        position: record.employees?.positions?.position_name,
        check_in: record.check_in || "-",
        check_out: record.check_out || "-",
        hours: record.hours_worked || 0,
        overtime: record.overtime_hours || 0,
        status: record.attendance_status,
        remarks: record.remarks || "-"
    }));

    const count = (status) => rows.filter((row) => row.status === status).length;
    const present = count("PRESENT"); const absent = count("ABSENT");

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
        insights: [
            present + absent ? `Attendance completion is ${Math.round((present / (present + absent)) * 100)}% for present/absent records.` : "No present or absent attendance records were captured for this period.",
            absent ? `${absent} absence record(s) need follow-up with the responsible manager.` : "No absence records require follow-up.",
            count("LATE") ? `${count("LATE")} late record(s) suggest reviewing transport, shift start, or check-in discipline.` : "No late records were reported."
        ],
        columns: [
            { key: "code", label: "Code", width: 10 },
            { key: "employee", label: "Employee", width: 18 },
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
                positions(position_name)
            )
        `)
        .gte("production_date", range.start)
        .lte("production_date", range.end)
        .order("production_date", { ascending: true });

    request = scopeByRelatedCompany(request, user);
    request = scopeByManager(request, user);
    const { data, error } = await request;
    if (error) throw error;

    const rows = (data || []).map((record) => ({
        department: record.employees?.positions?.position_name || "-",
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
    request = scopeByManager(request, user, "employees.manager_user_id");
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
        days: record.days_worked || 0,
        rate: record.employees?.daily_rate || 0,
        overtime: record.overtime_pay || 0,
        advances: record.advance_deduction || 0,
        deductions: record.deductions || 0,
        net: record.net_salary || 0,
        approval: record.approval_status || "-",
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
            { label: "Gross Worked Value", value: rows.reduce((sum, row) => sum + Number(row.basic || 0), 0) },
            { label: "Total Net Salary", value: rows.reduce((sum, row) => sum + Number(row.net || 0), 0) },
            { label: "Paid Payroll", value: rows.filter((row) => row.status === "PAID").length },
            { label: "Failed Payroll", value: rows.filter((row) => String(row.status).startsWith("FAILED")).length }
        ],
        insights: [
            `${rows.filter((row) => row.status === "PAID").length} worker payroll record(s) have been paid successfully.`,
            `${rows.filter((row) => String(row.status).startsWith("FAILED")).length} payroll payment(s) failed and need phone, balance, or provider follow-up.`,
            `${rows.filter((row) => row.approval !== "OWNER_APPROVED").length} payroll record(s) are not yet finally owner-approved.`
        ],
        columns: [
            { key: "employee", label: "Employee", width: 16 },
            { key: "period", label: "Payroll Period", width: 26 },
            { key: "position", label: "Position", width: 10 },
            { key: "days", label: "Days", width: 5 },
            { key: "rate", label: "Daily", width: 8 },
            { key: "basic", label: "Basic", width: 9 },
            { key: "overtime", label: "Overtime", width: 9 },
            { key: "advances", label: "Advances", width: 9 },
            { key: "net", label: "Net", width: 9 },
            { key: "approval", label: "Approval", width: 12 },
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
    request = scopeByManager(request, user, "employees.manager_user_id");
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
    request = scopeByManager(request, user);
    const { data, error } = await request;
    if (error) throw error;

    const rows = (data || []).map((record) => ({
        employee: nameOf(record.employees),
        code: record.employees?.employee_code || "-",
        amount: record.amount || 0,
        reason: record.reason || "-",
        status: record.status || "-",
        payment: record.payment_status || "UNPAID",
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
            { label: "Total Requested", value: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0) },
            { label: "Paid Advances", value: rows.filter((row) => row.payment === "PAID").reduce((sum, row) => sum + Number(row.amount || 0), 0) },
            { label: "Remaining To Pay", value: rows.filter((row) => row.status === "OWNER_APPROVED" && row.payment !== "PAID").reduce((sum, row) => sum + Number(row.amount || 0), 0) }
        ],
        insights: [
            `${rows.filter((row) => row.status === "OWNER_APPROVED" && row.payment !== "PAID").length} approved advance(s) are ready for owner payment.`,
            `${rows.filter((row) => row.payment === "PAID").length} advance(s) have already been paid.`,
            `${rows.filter((row) => row.status !== "OWNER_APPROVED" && row.payment !== "PAID").length} advance(s) remain in review or need changes.`
        ],
        columns: [
            { key: "code", label: "Code", width: 12 },
            { key: "employee", label: "Employee", width: 20 },
            { key: "amount", label: "Amount", width: 12 },
            { key: "reason", label: "Reason", width: 24 },
            { key: "status", label: "Status", width: 12 },
            { key: "payment", label: "Payment", width: 10 },
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
        if (type === "employees") request = scopeByManager(request, user);
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
    request = scopeByManager(request, user);
    if (user?.role_name === "ACCOUNTANT") request = request.eq("accountant_id", user.employee_id);

    const { data, error } = await request;
    if (error) throw error;

    const detailedRows = (data || []).flatMap((record) => {
        const activity = parseReportSummary(record.daily_summary).activity_rows || {};
        const employee = (row) => `${row.employees?.employee_code || ""} ${nameOf(row.employees)}`.trim();
        const status = (approval, payment) => [approval, payment].filter(Boolean).join(" / ");
        return [
            ...(activity.attendance || []).map((row) => ({ section: "Attendance", date: row.attendance_date, subject: employee(row), details: `In: ${row.check_in || "-"}; Out: ${row.check_out || "-"}; ${row.hours_worked || 0} hrs`, amount: "-", status: row.attendance_status || "-" })),
            ...(activity.production || []).map((row) => ({ section: "Production", date: row.production_date, subject: employee(row), details: `${row.mineral_type || "-"}: ${row.quantity || 0} ${row.unit || ""}; ${row.working_hours || 0} hrs`, amount: "-", status: row.activity_details || row.remarks || "Recorded" })),
            ...(activity.advances || []).map((row) => ({ section: "Advance", date: row.request_date, subject: employee(row), details: row.reason || "Advance request", amount: row.amount || 0, status: status(row.status, row.payment_status) })),
            ...(activity.payroll || []).map((row) => ({ section: "Payroll", date: record.report_date, subject: employee(row), details: `${row.days_worked || 0} days; ${row.payroll_period_start || "-"} to ${row.payroll_period_end || "-"}`, amount: row.net_salary || 0, status: status(row.approval_status, row.payment_status) })),
            ...(activity.expenses || []).map((row) => ({ section: "Expense / material", date: row.expense_date, subject: row.item_name || "-", details: `${row.quantity || 0} ${row.unit || ""}; buyer: ${row.buyer_name || "-"} (${row.buyer_phone || "-"})`, amount: row.total_amount || 0, status: status(row.approval_status, row.payment_status) })),
            ...(activity.worker_consumptions || []).map((row) => ({ section: "Worker item", date: row.consumption_date, subject: employee(row), details: `${row.item_name || "-"} × ${row.quantity || 0}; shopkeeper: ${row.shopkeepers?.shopkeeper_name || "-"}`, amount: row.total_amount || 0, status: status(row.approval_status, row.shopkeeper_payment_status) }))
        ];
    });
    if (detailedRows.length) {
        return createPdfBuffer({ title: `${range.label} Detailed Operations Register`, reportNumber: `DR-${Date.now()}`, company, generatedBy: generatedBy(user), summary: [{ label: "Period", value: `${range.start} to ${range.end}` }, { label: "Activity rows", value: detailedRows.length }, { label: "Recorded money", value: detailedRows.reduce((sum, row) => sum + Number(row.amount || 0), 0) }], insights: ["The table lists every saved attendance, production, advance, payroll, expense/material, and worker-item row for the report period."], columns: [{ key: "section", label: "Section", width: 14 }, { key: "date", label: "Date", width: 11 }, { key: "subject", label: "Worker / Item", width: 20 }, { key: "details", label: "Details", width: 31 }, { key: "amount", label: "Amount", width: 12 }, { key: "status", label: "Status", width: 17 }], rows: detailedRows });
    }

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

const expensesPdf = async (user, query) => {
    const company = await getCompany(user); const range = dateRange(query);
    let request = supabase.from("operational_expenses").select("*").gte("expense_date", range.start).lte("expense_date", range.end).order("expense_date", { ascending: false });
    request = scopeByCompany(request, user); request = scopeByManager(request, user);
    const { data, error } = await request; if (error) throw error;
    const rows = (data || []).map((record) => ({ date: record.expense_date, category: record.expense_category, item: record.item_name, quantity: `${record.quantity} ${record.unit}`, amount: record.total_amount, buyer: record.buyer_name, phone: record.buyer_phone, approval: record.approval_status, payment: record.payment_status }));
    const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return createPdfBuffer({ title: `${range.label} Expenses and Materials Report`, reportNumber: `EXP-${Date.now()}`, company, generatedBy: generatedBy(user), summary: [{ label: "Period", value: `${range.start} to ${range.end}` }, { label: "Purchases", value: rows.length }, { label: "Recorded total", value: total }, { label: "Paid total", value: rows.filter((row) => row.payment === "PAID").reduce((sum, row) => sum + Number(row.amount || 0), 0) }, { label: "Ready to pay", value: rows.filter((row) => row.approval === "OWNER_APPROVED" && row.payment !== "PAID").reduce((sum, row) => sum + Number(row.amount || 0), 0) }], insights: [`${rows.filter((row) => row.approval === "PENDING_MANAGER").length} purchase(s) are awaiting manager approval.`, `${rows.filter((row) => row.approval === "OWNER_APPROVED" && row.payment !== "PAID").length} final-approved purchase(s) await payment.`, `${rows.filter((row) => row.payment === "PAID").length} purchase(s) have been paid.`], columns: [{ key: "date", label: "Date", width: 10 }, { key: "category", label: "Category", width: 11 }, { key: "item", label: "Item / Expense", width: 19 }, { key: "quantity", label: "Quantity", width: 10 }, { key: "amount", label: "Amount", width: 11 }, { key: "buyer", label: "Buyer", width: 15 }, { key: "phone", label: "MTN Number", width: 13 }, { key: "approval", label: "Approval", width: 13 }, { key: "payment", label: "Payment", width: 10 }], rows });
};

const foodSuppliesPdf = async (user, query) => {
    const { listFoodSupplies } = require('./foodSupply.service'); const company = await getCompany(user); const range = dateRange(query);
    const supplies = (await listFoodSupplies(user)).filter((row) => row.supply_date >= range.start && row.supply_date <= range.end);
    const rows = supplies.flatMap((supply) => (supply.food_supply_items || []).map((item) => ({ date: supply.supply_date, manager: supply.manager_user_id, item: `${item.food_name} (${item.quantity} ${item.unit})`, amount: Number(item.quantity || 0) * Number(item.unit_price || 0), approval: supply.status, payment: supply.payment_status })));
    return createPdfBuffer({ title: `${range.label} Food Supply Report`, reportNumber: `FOOD-${Date.now()}`, company, generatedBy: generatedBy(user), summary: [{ label: 'Period', value: `${range.start} to ${range.end}` }, { label: 'Supply items', value: rows.length }, { label: 'Total supplied', value: rows.reduce((s, r) => s + Number(r.amount || 0), 0) }, { label: 'Paid value', value: rows.filter(r => r.payment === 'PAID').reduce((s, r) => s + Number(r.amount || 0), 0) }], columns: [{ key: 'date', label: 'Date', width: 12 }, { key: 'manager', label: 'Manager Unit', width: 18 }, { key: 'item', label: 'Food Supplied', width: 28 }, { key: 'amount', label: 'Amount', width: 14 }, { key: 'approval', label: 'Approval', width: 15 }, { key: 'payment', label: 'Payment', width: 13 }], rows });
};

const buildReportPdf = async (type, user, query) => {
    if (type === "attendance") return attendancePdf(user, query);
    if (type === "production") return productionPdf(user, query);
    if (type === "payroll") return payrollPdf(user, query);
    if (type === "payments") return paymentPdf(user, query);
    if (type === "advances") return advancesPdf(user, query);
    if (type === "expenses") return expensesPdf(user, query);
    if (type === "food-supplies") return foodSuppliesPdf(user, query);
    if (type === "employees" || type === "departments" || type === "positions") return simpleEmployeePdf(user, query, type);
    if (type === "reports") return dailyReportsPdf(user, query);
    throw new Error("Unsupported report type.");
};

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const csvValue = (value) => typeof value === "object" ? JSON.stringify(value) : value;

const buildReportCsv = async (type, user, query = {}) => {
    const range = dateRange(query);
    const base = { title: `${type.charAt(0).toUpperCase()}${type.slice(1)} Report`, columns: [], rows: [] };
    let request;

    if (type === "attendance") {
        request = scopeByManager(scopeByCompany(supabase.from("attendance").select("attendance_date,check_in,check_out,hours_worked,overtime_hours,attendance_status,remarks,employees(employee_code,first_name,last_name)").gte("attendance_date", range.start).lte("attendance_date", range.end).order("attendance_date"), user), user);
        const { data, error } = await request; if (error) throw error;
        base.title = `${range.label} Attendance Report`;
        base.columns = ["Date", "Employee Code", "Employee", "Check In", "Check Out", "Hours", "Overtime", "Status", "Remarks"];
        base.rows = (data || []).map(r => [r.attendance_date, r.employees?.employee_code, nameOf(r.employees), r.check_in, r.check_out, r.hours_worked, r.overtime_hours, r.attendance_status, r.remarks]);
    } else if (type === "production") {
        request = scopeByManager(scopeByRelatedCompany(supabase.from("production_records").select("production_date,mineral_type,quantity,unit,working_hours,activity_details,remarks,employees!inner(employee_code,first_name,last_name,company_id)").gte("production_date", range.start).lte("production_date", range.end).order("production_date"), user), user);
        const { data, error } = await request; if (error) throw error;
        base.title = `${range.label} Production Report`;
        base.columns = ["Date", "Worker Code", "Worker", "Mineral", "Quantity", "Unit", "Working Hours", "Activity Details", "Remarks"];
        base.rows = (data || []).map(r => [r.production_date, r.employees?.employee_code, nameOf(r.employees), r.mineral_type, r.quantity, r.unit, r.working_hours, r.activity_details, r.remarks]);
    } else if (type === "payroll") {
        request = scopeByManager(scopeByRelatedCompany(supabase.from("payroll").select("payroll_frequency,payroll_period_start,payroll_period_end,payroll_month,payroll_year,days_worked,basic_salary,overtime_hours,overtime_pay,advance_deduction,consumption_deduction,deductions,net_salary,approval_status,payment_status,generated_at,employees!inner(employee_code,first_name,last_name,daily_rate,company_id)").order("generated_at", { ascending: false }), user), user, "employees.manager_user_id");
        if (query.payroll_period_start && query.payroll_period_end) request = request.eq("payroll_frequency", "BIWEEKLY").eq("payroll_period_start", query.payroll_period_start).eq("payroll_period_end", query.payroll_period_end);
        const { data, error } = await request; if (error) throw error;
        base.title = "Payroll Report";
        base.columns = ["Generated", "Employee Code", "Employee", "Period", "Daily Rate", "Worked Days", "Gross Value", "Overtime Hours", "Overtime Pay", "Advance Deduction", "Worker Item Deduction", "Other Deductions", "Net Salary", "Approval", "Payment"];
        base.rows = (data || []).map(r => [r.generated_at, r.employees?.employee_code, nameOf(r.employees), r.payroll_frequency === "BIWEEKLY" ? `${r.payroll_period_start} to ${r.payroll_period_end}` : `${r.payroll_month}/${r.payroll_year}`, r.employees?.daily_rate, r.days_worked, r.basic_salary, r.overtime_hours, r.overtime_pay, r.advance_deduction, r.consumption_deduction, r.deductions, r.net_salary, r.approval_status, r.payment_status]);
    } else if (type === "advances") {
        request = scopeByManager(scopeByRelatedCompany(supabase.from("salary_advances").select("request_date,amount,amount_paid,remaining_balance,reason,status,payment_status,payment_date,employees!inner(employee_code,first_name,last_name,company_id)").order("created_at", { ascending: false }), user), user);
        const { data, error } = await request; if (error) throw error;
        base.title = "Salary Advances Report";
        base.columns = ["Request Date", "Employee Code", "Employee", "Requested", "Paid", "Remaining", "Reason", "Approval Status", "Payment Status", "Payment Date"];
        base.rows = (data || []).map(r => [r.request_date, r.employees?.employee_code, nameOf(r.employees), r.amount, r.amount_paid, r.remaining_balance, r.reason, r.status, r.payment_status, r.payment_date]);
    } else if (type === "payments") {
        request = scopeByManager(scopeByRelatedCompany(supabase.from("payments").select("payment_date,receiver_phone,phone,receiver_name,beneficiary_name,amount,payment_method,reference_id,transaction_reference,payment_status,failure_reason,employees!inner(employee_code,first_name,last_name,company_id)").order("payment_date", { ascending: false }), user), user, "employees.manager_user_id");
        const { data, error } = await request; if (error) throw error;
        base.title = "Payments Report";
        base.columns = ["Payment Date", "Employee Code", "Employee", "Beneficiary", "Phone", "Amount", "Method", "Reference", "Status", "Failure Reason"];
        base.rows = (data || []).map(r => [r.payment_date, r.employees?.employee_code, nameOf(r.employees), r.receiver_name || r.beneficiary_name, r.receiver_phone || r.phone, r.amount, r.payment_method, r.reference_id || r.transaction_reference, r.payment_status, r.failure_reason]);
    } else if (type === "employees") {
        request = scopeByManager(scopeByCompany(supabase.from("employees").select("employee_code,first_name,last_name,phone,address,hire_date,daily_rate,ejo_heza,mutuelle_de_sante,status,positions(position_name)").eq("is_worker", true).order("employee_code"), user), user);
        const { data, error } = await request; if (error) throw error;
        base.title = "Workers Report";
        base.columns = ["Worker Code", "First Name", "Last Name", "Position", "Phone", "Address", "Hire Date", "Daily Rate", "Ejo Heza", "Mutuelle de Santé", "Status"];
        base.rows = (data || []).map(r => [r.employee_code, r.first_name, r.last_name, r.positions?.position_name, r.phone, r.address, r.hire_date, r.daily_rate, r.ejo_heza ? "Yes" : "No", r.mutuelle_de_sante ? "Yes" : "No", r.status]);
    } else if (type === "departments") {
        request = scopeByCompany(supabase.from("departments").select("department_id,department_name,description,created_at").order("department_name"), user);
        const { data, error } = await request; if (error) throw error;
        base.title = "Departments Report"; base.columns = ["Department ID", "Department", "Description", "Created"];
        base.rows = (data || []).map(r => [r.department_id, r.department_name, r.description, r.created_at]);
    } else if (type === "positions") {
        request = scopeByCompany(supabase.from("positions").select("position_id,position_name,description,daily_salary,created_at").order("position_name"), user);
        const { data, error } = await request; if (error) throw error;
        base.title = "Positions Report"; base.columns = ["Position ID", "Position", "Description", "Daily Salary", "Created"];
        base.rows = (data || []).map(r => [r.position_id, r.position_name, r.description, r.daily_salary, r.created_at]);
    } else if (type === "reports") {
        request = scopeByManager(scopeByCompany(supabase.from("reports").select("report_date,report_type,period_start,period_end,title,status,attendance_summary,production_summary,advances_summary,daily_summary,employees(first_name,last_name)").gte("report_date", range.start).lte("report_date", range.end).order("report_date", { ascending: false }), user), user);
        if (user?.role_name === "ACCOUNTANT") request = request.eq("accountant_id", user.employee_id);
        const { data, error } = await request; if (error) throw error;
        base.title = `${range.label} Operations Reports`;
        base.columns = ["Report Date", "Type", "Period Start", "Period End", "Title", "Prepared By", "Present", "Attendance Hours", "Production Quantity", "Advance Total", "Payroll Net", "Status"];
        base.rows = (data || []).map(r => { const daily = parseReportSummary(r.daily_summary); return [r.report_date, r.report_type, r.period_start, r.period_end, r.title, nameOf(r.employees), r.attendance_summary?.present || 0, r.attendance_summary?.hours || 0, (r.production_summary?.minerals || []).reduce((s, m) => s + Number(m.quantity || 0), 0), r.advances_summary?.total || 0, daily.payroll_summary?.net_salary || 0, r.status]; });
    } else throw new Error("Unsupported report type.");

    const numericTotals = base.columns.map((column, index) => /amount|salary|value|pay|deduction|quantity|hours|rate|requested|paid|remaining|gross|net/i.test(column)
        ? base.rows.reduce((sum, row) => sum + (Number(row[index]) || 0), 0) : null);
    const output = [
        [base.title],
        ["Period", `${range.start} to ${range.end}`],
        ["Generated by", generatedBy(user)],
        [],
        base.columns,
        ...base.rows,
        [],
        ["TOTALS", ...numericTotals.slice(1)]
    ].map(row => row.map(csvValue).map(csvCell).join(",")).join("\r\n");
    return Buffer.from(`\uFEFF${output}`, "utf8");
};

module.exports = {
    buildReportPdf,
    buildReportCsv,
    sendPdf
};
