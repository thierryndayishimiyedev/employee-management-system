const supabase = require("../config/supabase");
const { requireCompanyIds, resolveAuthorizedCompanyId } = require("../utils/companyScope");
const { requireManagerUserId } = require("../utils/managerScope");

const sum = (rows, key) => (rows || []).reduce((total, row) => total + Number(row[key] || 0), 0);
const count = (rows, predicate) => (rows || []).filter(predicate).length;

// Trend series are derived only from records already visible to the current
// company/manager scope.  We deliberately do not invent a mineral value: the
// system records extraction quantities before a selling price is known.
const dateSeries = (rows, dateKey, valueKey, predicate = () => true) => {
    const grouped = new Map();
    (rows || []).filter(predicate).forEach((row) => {
        const value = row[dateKey];
        if (!value) return;
        const date = String(value).slice(0, 10);
        grouped.set(date, (grouped.get(date) || 0) + Number(row[valueKey] || 0));
    });
    return Array.from(grouped, ([date, value]) => ({ date, value }))
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(-12);
};

// Merges several financial record types by their real record date so a
// dashboard can compare related money flows in one chart. Each source is
// already restricted to the viewer's company/manager scope.
const combinedDateSeries = (sources) => {
    const grouped = new Map();
    sources.forEach(({ rows, dateKey, fields, predicate = () => true }) => {
        (rows || []).filter(predicate).forEach((row) => {
            const date = dayKey(row[dateKey]);
            if (!date) return;
            const item = grouped.get(date) || { date };
            Object.entries(fields).forEach(([outputKey, sourceKey]) => {
                const sourceValue = typeof sourceKey === "function" ? sourceKey(row) : row[sourceKey];
                item[outputKey] = Number(item[outputKey] || 0) + Number(sourceValue || 0);
            });
            grouped.set(date, item);
        });
    });
    return Array.from(grouped.values()).sort((left, right) => left.date.localeCompare(right.date)).slice(-12);
};

const attendanceSeries = (rows) => {
    const grouped = new Map();
    (rows || []).forEach((row) => {
        if (!row.attendance_date) return;
        const date = String(row.attendance_date).slice(0, 10);
        const value = grouped.get(date) || { date, present: 0, absent: 0, hours: 0 };
        if (row.attendance_status === "PRESENT") value.present += 1;
        if (row.attendance_status === "ABSENT") value.absent += 1;
        value.hours += Number(row.hours_worked || 0);
        grouped.set(date, value);
    });
    return Array.from(grouped.values()).sort((left, right) => left.date.localeCompare(right.date)).slice(-12);
};

const isFailed = (status) => String(status || "").toUpperCase().startsWith("FAILED");
const isUnpaid = (status) => String(status || "").toUpperCase() !== "PAID";
const foodTotal = (row) => (row.food_supply_items || []).reduce((total, item) => total + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);

const records = async (table, fields, companyIds, managerUserId = null) => {
    let query = supabase.from(table).select(fields).in("company_id", companyIds);
    if (managerUserId) query = query.eq("manager_user_id", managerUserId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

const advanceRecords = async (companyIds, managerUserId = null) => {
    let query = supabase.from("salary_advances")
        .select("advance_id,manager_user_id,amount,amount_paid,remaining_balance,status,payment_status,request_date,employees!inner(company_id)")
        .in("employees.company_id", companyIds);
    if (managerUserId) query = query.eq("manager_user_id", managerUserId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

const productionRecords = async (companyIds, managerUserId = null) => {
    let query = supabase.from("production_records")
        .select("production_id,manager_user_id,production_date,quantity,employees!inner(company_id)")
        .in("employees.company_id", companyIds);
    if (managerUserId) query = query.eq("manager_user_id", managerUserId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

const workerRecords = async (companyIds, managerUserId = null) => {
    let query = supabase.from("employees")
        .select("employee_id,company_id,manager_user_id,status,payment_type")
        .in("company_id", companyIds)
        .eq("is_worker", true);
    if (managerUserId) query = query.eq("manager_user_id", managerUserId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

const dayKey = (value) => String(value || "").slice(0, 10);
const startOfMonday = (value) => {
    const date = new Date(`${value}T00:00:00Z`);
    const day = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
    return date.toISOString().slice(0, 10);
};
const periodMatch = (value, period, today) => {
    const date = dayKey(value);
    if (!date) return false;
    if (period === "today") return date === today;
    if (period === "week") return startOfMonday(date) === startOfMonday(today);
    if (period === "month") return date.slice(0, 7) === today.slice(0, 7);
    return date.slice(0, 4) === today.slice(0, 4);
};

const getManagers = async (companyIds) => {
    const { data, error } = await supabase.from("users")
        .select("user_id, username, employees!fk_user_employee!inner(company_id,first_name,last_name), roles!inner(role_name)")
        .in("employees.company_id", companyIds)
        .eq("roles.role_name", "MANAGER");
    if (error) throw error;
    return (data || []).map((item) => ({
        user_id: item.user_id,
        company_id: item.employees.company_id,
        name: [item.employees.first_name, item.employees.last_name].filter(Boolean).join(" ") || item.username
    }));
};

const aggregate = async (companyIds, managerUserId = null) => {
    const [employees, attendance, payroll, advances, production, consumptions, payments, reports, food, expenses, flexibleWork] = await Promise.all([
        workerRecords(companyIds, managerUserId),
        records("attendance", "attendance_date,attendance_status,hours_worked,overtime_hours,manager_user_id", companyIds, managerUserId),
        records("payroll", "payroll_id,manager_user_id,payroll_frequency,payroll_period_start,payroll_period_end,payroll_month,payroll_year,basic_salary,net_salary,advance_deduction,consumption_deduction,approval_status,payment_status,generated_at", companyIds, managerUserId),
        advanceRecords(companyIds, managerUserId),
        productionRecords(companyIds, managerUserId),
        records("worker_consumptions", "consumption_id,manager_user_id,item_name,total_amount,remaining_balance,consumption_date,approval_status,shopkeeper_payment_status,created_at", companyIds, managerUserId),
        records("payments", "payment_id,manager_user_id,amount,payment_status,failure_reason,paid_at", companyIds, managerUserId),
        records("reports", "report_id,manager_user_id,report_date,status", companyIds, managerUserId),
        records("food_supplies", "food_supply_id,manager_user_id,status,payment_status,supply_date,created_at,food_supply_items(quantity,unit_price)", companyIds, managerUserId),
        records("operational_expenses", "expense_id,manager_user_id,expense_date,expense_category,item_name,quantity,total_amount,approval_status,payment_status,created_at", companyIds, managerUserId),
        records("flexible_work_entries", "flexible_work_id,manager_user_id,employee_id,work_date,agreed_daily_rate,payroll_id", companyIds, managerUserId)
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const productionValue = 0; // Production is measured, not priced, at extraction time.
    const grouped = {};
    payroll.forEach((row) => {
        const period = row.payroll_period_start && row.payroll_period_end ? `${row.payroll_period_start}:${row.payroll_period_end}` : `${row.payroll_year}-${row.payroll_month}`;
        const key = `${row.manager_user_id}:${period}`;
        const item = grouped[key] || { manager_user_id: row.manager_user_id, period_start: row.payroll_period_start, period_end: row.payroll_period_end, payroll_month: row.payroll_month, payroll_year: row.payroll_year, employees: 0, gross_salary: 0, advance_deduction: 0, consumption_deduction: 0, net_salary: 0, approval_status: row.approval_status, payment_status: row.payment_status };
        item.employees += 1; item.gross_salary += Number(row.basic_salary || 0); item.advance_deduction += Number(row.advance_deduction || 0); item.consumption_deduction += Number(row.consumption_deduction || 0); item.net_salary += Number(row.net_salary || 0); grouped[key] = item;
    });
    const foodPending = food.filter(row => row.status === "OWNER_APPROVED" && isUnpaid(row.payment_status));
    const consumptionReady = consumptions.filter(row => row.approval_status === "OWNER_APPROVED" && isUnpaid(row.shopkeeper_payment_status));
    const ownerApprovals = [
        ...payroll.filter(row => row.approval_status === "GENERATED").map(row => ({ type: "Payroll", date: row.generated_at, status: "PENDING_MANAGER", amount: Number(row.net_salary || 0), manager_user_id: row.manager_user_id })),
        ...payroll.filter(row => row.approval_status === "MANAGER_APPROVED").map(row => ({ type: "Payroll", date: row.generated_at, status: row.approval_status, amount: Number(row.net_salary || 0), manager_user_id: row.manager_user_id })),
        ...advances.filter(row => row.status === "PENDING_MANAGER").map(row => ({ type: "Advance", date: row.request_date, status: row.status, amount: Number(row.amount || 0), manager_user_id: row.manager_user_id })),
        ...advances.filter(row => row.status === "PENDING_OWNER").map(row => ({ type: "Advance", date: row.request_date, status: row.status, amount: Number(row.amount || 0), manager_user_id: row.manager_user_id })),
        ...expenses.filter(row => row.approval_status === "PENDING_MANAGER").map(row => ({ type: "Expense / material", date: row.created_at || row.expense_date, status: row.approval_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...expenses.filter(row => row.approval_status === "PENDING_OWNER").map(row => ({ type: "Expense / material", date: row.created_at || row.expense_date, status: row.approval_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...food.filter(row => row.status === "PENDING_MANAGER").map(row => ({ type: "Food supply", date: row.created_at || row.supply_date, status: row.status, amount: foodTotal(row), manager_user_id: row.manager_user_id })),
        ...food.filter(row => row.status === "PENDING_OWNER").map(row => ({ type: "Food supply", date: row.created_at || row.supply_date, status: row.status, amount: foodTotal(row), manager_user_id: row.manager_user_id })),
        ...consumptions.filter(row => row.approval_status === "PENDING_MANAGER").map(row => ({ type: "Shopkeeper payment", date: row.created_at || row.consumption_date, status: row.approval_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...consumptions.filter(row => row.approval_status === "PENDING_OWNER").map(row => ({ type: "Shopkeeper payment", date: row.created_at || row.consumption_date, status: row.approval_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name }))
    ].sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")));
    const readyPayments = [
        ...payroll.filter(row => row.approval_status === "OWNER_APPROVED" && isUnpaid(row.payment_status)).map(row => ({ type: "Payroll", date: row.generated_at, status: row.payment_status, amount: Number(row.net_salary || 0), manager_user_id: row.manager_user_id })),
        ...advances.filter(row => row.status === "OWNER_APPROVED" && isUnpaid(row.payment_status)).map(row => ({ type: "Advance", date: row.request_date, status: row.payment_status, amount: Number(row.remaining_balance || row.amount || 0), manager_user_id: row.manager_user_id })),
        ...expenses.filter(row => row.approval_status === "OWNER_APPROVED" && isUnpaid(row.payment_status)).map(row => ({ type: "Expense / material", date: row.created_at || row.expense_date, status: row.payment_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...foodPending.map(row => ({ type: "Food supplier", date: row.created_at || row.supply_date, status: row.payment_status, amount: foodTotal(row), manager_user_id: row.manager_user_id })),
        ...consumptionReady.map(row => ({ type: "Shopkeeper", date: row.created_at || row.consumption_date, status: row.shopkeeper_payment_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name }))
    ].sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")));
    const paymentPlan = {
        ready_total: readyPayments.reduce((total, row) => total + Number(row.amount || 0), 0),
        ready_count: readyPayments.length,
        oldest_ready_date: readyPayments.length ? readyPayments.reduce((oldest, row) => !oldest || String(row.date || "") < String(oldest || "") ? row.date : oldest, null) : null,
        pending_total: ownerApprovals.reduce((total, row) => total + Number(row.amount || 0), 0),
        pending_count: ownerApprovals.length,
        by_type: ["Payroll", "Advance", "Food supplier", "Shopkeeper", "Expense / material"].map((type) => {
            const rows = readyPayments.filter((row) => row.type === type);
            return { type, count: rows.length, total: rows.reduce((total, row) => total + Number(row.amount || 0), 0), oldest_date: rows.length ? rows.reduce((oldest, row) => !oldest || String(row.date || "") < String(oldest || "") ? row.date : oldest, null) : null };
        })
    };
    const failedPayments = [
        ...payments.filter(row => isFailed(row.payment_status)).map(row => ({ type: "Payment", date: row.paid_at, status: row.payment_status, amount: Number(row.amount || 0), manager_user_id: row.manager_user_id, reason: row.failure_reason })),
        ...payroll.filter(row => isFailed(row.payment_status)).map(row => ({ type: "Payroll", date: row.generated_at, status: row.payment_status, amount: Number(row.net_salary || 0), manager_user_id: row.manager_user_id })),
        ...advances.filter(row => isFailed(row.payment_status)).map(row => ({ type: "Advance", date: row.request_date, status: row.payment_status, amount: Number(row.amount || 0), manager_user_id: row.manager_user_id })),
        ...expenses.filter(row => isFailed(row.payment_status)).map(row => ({ type: "Expense / material", date: row.created_at || row.expense_date, status: row.payment_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...food.filter(row => isFailed(row.payment_status)).map(row => ({ type: "Food supplier", date: row.created_at || row.supply_date, status: row.payment_status, amount: foodTotal(row), manager_user_id: row.manager_user_id })),
        ...consumptions.filter(row => isFailed(row.shopkeeper_payment_status)).map(row => ({ type: "Shopkeeper", date: row.created_at || row.consumption_date, status: row.shopkeeper_payment_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name }))
    ].sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")));
    const activity = [
        ...payroll.map(row => ({ type: "Payroll", date: row.generated_at, status: row.payment_status || row.approval_status, amount: Number(row.net_salary || 0), manager_user_id: row.manager_user_id })),
        ...advances.map(row => ({ type: "Advance", date: row.request_date, status: row.payment_status || row.status, amount: Number(row.amount || 0), manager_user_id: row.manager_user_id })),
        ...expenses.map(row => ({ type: "Expense / material", date: row.created_at || row.expense_date, status: row.payment_status || row.approval_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...food.map(row => ({ type: "Food supply", date: row.created_at || row.supply_date, status: row.payment_status || row.status, amount: foodTotal(row), manager_user_id: row.manager_user_id })),
        ...consumptions.map(row => ({ type: "Shopkeeper consumption", date: row.created_at || row.consumption_date, status: row.shopkeeper_payment_status || row.approval_status, amount: Number(row.total_amount || 0), manager_user_id: row.manager_user_id, detail: row.item_name })),
        ...production.map(row => ({ type: "Production", date: row.production_date, status: "RECORDED", quantity: Number(row.quantity || 0), manager_user_id: row.manager_user_id }))
    ].sort((left, right) => String(right.date || "").localeCompare(String(left.date || ""))).slice(0, 30);
    const periodTotals = ["today", "week", "month", "year"].reduce((all, period) => {
        const filter = (rows, dateField) => rows.filter((row) => periodMatch(row[dateField], period, today));
        const periodPayroll = filter(payroll, "generated_at");
        const fixedPayroll = periodPayroll.filter((row) => row.payroll_frequency !== "WEEKLY");
        const flexiblePayroll = periodPayroll.filter((row) => row.payroll_frequency === "WEEKLY");
        const periodAdvances = filter(advances, "request_date");
        const periodFood = food.filter((row) => periodMatch(row.supply_date || row.created_at, period, today));
        const periodExpenses = expenses.filter((row) => periodMatch(row.expense_date || row.created_at, period, today));
        const periodConsumptions = consumptions.filter((row) => periodMatch(row.consumption_date || row.created_at, period, today));
        const periodProduction = filter(production, "production_date");
        const periodFlexibleWork = filter(flexibleWork, "work_date");
        all[period] = {
            label: period,
            fixed_payroll_gross: sum(fixedPayroll, "basic_salary"),
            fixed_payroll_advances: sum(fixedPayroll, "advance_deduction"),
            fixed_payroll_consumptions: sum(fixedPayroll, "consumption_deduction"),
            fixed_payroll_net: sum(fixedPayroll, "net_salary"),
            flexible_payroll_total: sum(flexiblePayroll, "net_salary"),
            flexible_work_value: sum(periodFlexibleWork, "agreed_daily_rate"),
            flexible_work_days: periodFlexibleWork.length,
            advances_total: sum(periodAdvances, "amount"),
            food_total: periodFood.reduce((total, row) => total + foodTotal(row), 0),
            expenses_total: sum(periodExpenses, "total_amount"),
            consumptions_total: sum(periodConsumptions, "total_amount"),
            production_quantity: sum(periodProduction, "quantity"),
            pending_approvals: count([...periodPayroll, ...periodAdvances, ...periodFood, ...periodExpenses, ...periodConsumptions], (row) => ["GENERATED", "PENDING_MANAGER", "PENDING_OWNER", "CHANGES_REQUESTED"].includes(row.approval_status || row.status)),
            ready_to_pay: sum(periodPayroll.filter((row) => row.approval_status === "OWNER_APPROVED" && isUnpaid(row.payment_status)), "net_salary") + sum(periodAdvances.filter((row) => row.status === "OWNER_APPROVED" && isUnpaid(row.payment_status)), "remaining_balance") + periodFood.filter((row) => row.status === "OWNER_APPROVED" && isUnpaid(row.payment_status)).reduce((total, row) => total + foodTotal(row), 0) + sum(periodExpenses.filter((row) => row.approval_status === "OWNER_APPROVED" && isUnpaid(row.payment_status)), "total_amount") + sum(periodConsumptions.filter((row) => row.approval_status === "OWNER_APPROVED" && isUnpaid(row.shopkeeper_payment_status)), "total_amount")
        };
        return all;
    }, {});
    return {
        counts: { workers: employees.length, fixed_workers: count(employees, row => row.payment_type !== "FLEXIBLE_DAILY"), flexible_workers: count(employees, row => row.payment_type === "FLEXIBLE_DAILY"), attendance_today: count(attendance, row => row.attendance_date === today), present_today: count(attendance, row => row.attendance_date === today && ["PRESENT", "LATE"].includes(row.attendance_status)), absent_today: count(attendance, row => row.attendance_date === today && row.attendance_status === "ABSENT"), reports_waiting: count(reports, row => row.status === "PENDING_MANAGER"), pending_approvals: ownerApprovals.length, ready_payments: readyPayments.length, failed_payments: failedPayments.length },
        financial: { payroll_pending: sum(payroll.filter(row => isUnpaid(row.payment_status)), "net_salary"), payroll_approved: sum(payroll.filter(row => row.approval_status === "OWNER_APPROVED"), "net_salary"), payroll_paid: sum(payroll.filter(row => row.payment_status === "PAID"), "net_salary"), advances_pending: sum(advances.filter(row => !["OWNER_APPROVED", "PAID"].includes(row.status)), "amount"), advances_approved: sum(advances.filter(row => row.status === "OWNER_APPROVED"), "amount"), advances_paid: sum(advances.filter(row => row.payment_status === "PAID"), "amount_paid"), consumption_total: sum(consumptions, "total_amount"), consumption_outstanding: sum(consumptions, "remaining_balance"), shopkeeper_ready_to_pay: sum(consumptionReady, "total_amount"), food_total: food.reduce((total, row) => total + foodTotal(row), 0), food_ready_to_pay: foodPending.reduce((total, row) => total + foodTotal(row), 0), food_paid: food.filter(row => row.payment_status === "PAID").reduce((total, row) => total + foodTotal(row), 0), expenses_total: sum(expenses, "total_amount"), expenses_paid: sum(expenses.filter(row => row.payment_status === "PAID"), "total_amount"), expenses_pending: sum(expenses.filter(row => isUnpaid(row.payment_status)), "total_amount"), expenses_ready_to_pay: sum(expenses.filter(row => row.approval_status === "OWNER_APPROVED" && isUnpaid(row.payment_status)), "total_amount"), awaiting_payment: readyPayments.reduce((total, row) => total + Number(row.amount || 0), 0), failed_payments: failedPayments.reduce((total, row) => total + Number(row.amount || 0), 0), total_spent: sum(payroll.filter(row => row.payment_status === "PAID"), "net_salary") + sum(advances.filter(row => row.payment_status === "PAID"), "amount_paid") + sum(expenses.filter(row => row.payment_status === "PAID"), "total_amount") + food.filter(row => row.payment_status === "PAID").reduce((total, row) => total + foodTotal(row), 0) + sum(consumptions.filter(row => row.shopkeeper_payment_status === "PAID"), "total_amount") },
        operations: { attendance_hours: sum(attendance, "hours_worked"), overtime_hours: sum(attendance, "overtime_hours"), production_quantity: sum(production, "quantity"), production_records: production.length, production_value: productionValue, production_expenses: sum(expenses, "total_amount"), production_net: productionValue, food_supplies: food.length, material_purchases: expenses.length, equipment_quantity: sum(expenses.filter(row => ["EQUIPMENT", "TOOL"].includes(row.expense_category)), "quantity") },
        charts: {
            attendance: attendanceSeries(attendance),
            payroll_commitments: combinedDateSeries([
                { rows: payroll, dateKey: "generated_at", fields: { gross_payroll: "basic_salary", net_payroll: "net_salary" } },
                { rows: advances, dateKey: "request_date", fields: { advances: "amount" } },
                { rows: expenses, dateKey: "expense_date", fields: { expenses: "total_amount" } }
            ]),
            payment_cashflow: combinedDateSeries([
                { rows: food, dateKey: "supply_date", fields: { food_supplies: foodTotal } },
                { rows: consumptions, dateKey: "consumption_date", fields: { worker_consumptions: "total_amount" } },
                { rows: payments, dateKey: "paid_at", fields: { completed_payments: "amount" }, predicate: row => row.payment_status === "PAID" }
            ]).map((item) => item),
            payroll: dateSeries(payroll, "generated_at", "net_salary"),
            flexible_work: dateSeries(flexibleWork, "work_date", "agreed_daily_rate"),
            advances: dateSeries(advances, "request_date", "amount"),
            production: dateSeries(production, "production_date", "quantity"),
            expenses: dateSeries(expenses, "expense_date", "total_amount"),
            payments: dateSeries(payments, "paid_at", "amount", row => row.payment_status === "PAID"),
            workflow_distribution: [
                { name: "Pending review", value: ownerApprovals.length },
                { name: "Ready to pay", value: readyPayments.length },
                { name: "Paid", value: payroll.filter(row => row.payment_status === "PAID").length + advances.filter(row => row.payment_status === "PAID").length + expenses.filter(row => row.payment_status === "PAID").length + food.filter(row => row.payment_status === "PAID").length + consumptions.filter(row => row.shopkeeper_payment_status === "PAID").length },
                { name: "Failed", value: failedPayments.length }
            ],
            cost_distribution: [
                { name: "Fixed payroll", value: sum(payroll.filter(row => row.payroll_frequency !== "WEEKLY"), "net_salary") },
                { name: "Flexible payroll", value: sum(payroll.filter(row => row.payroll_frequency === "WEEKLY"), "net_salary") },
                { name: "Advances", value: sum(advances, "amount") },
                { name: "Worker consumptions", value: sum(consumptions, "total_amount") },
                { name: "Food supplies", value: food.reduce((total, row) => total + foodTotal(row), 0) },
                { name: "Expenses & materials", value: sum(expenses, "total_amount") }
            ],
            // This is intentionally null until mineral sale price/revenue is recorded.
            profit_available: false,
            profit_reason: "Profit is unavailable until mineral sale prices are recorded."
        },
        periods: periodTotals, payment_plan: paymentPlan, payroll_periods: Object.values(grouped), recent: { payroll: payroll.slice(-8), advances: advances.slice(-8) }, owner_tracking: { approvals: ownerApprovals, ready_payments: readyPayments, failed_payments: failedPayments, activity }
    };
};

const getOwnerDashboard = async (user, filters = {}) => {
    const assigned = requireCompanyIds(user);
    const companyIds = filters.company_id ? [resolveAuthorizedCompanyId(user, filters.company_id)] : assigned;
    const managers = (await getManagers(companyIds));
    const managerId = filters.manager_user_id || null;
    if (managerId && !managers.some(manager => manager.user_id === managerId)) throw new Error("Selected manager is not assigned to your company.");
    const data = await aggregate(companyIds, managerId);
    const { data: accountants, error } = await supabase.from("users").select("user_id,employees!fk_user_employee!inner(company_id,manager_user_id),roles!inner(role_name)").in("employees.company_id", companyIds).eq("roles.role_name", "ACCOUNTANT");
    if (error) throw error;
    const comparison = managerId ? [] : await Promise.all(managers.map(async (manager) => {
        const totals = await aggregate(companyIds, manager.user_id);
        return {
            manager_user_id: manager.user_id,
            manager_name: manager.name,
            workers: totals.counts.workers,
            fixed_workers: totals.counts.fixed_workers,
            flexible_workers: totals.counts.flexible_workers,
            payroll_paid: totals.financial.payroll_paid,
            advances_paid: totals.financial.advances_paid,
            worker_items: totals.financial.consumption_total,
            expenses_paid: totals.financial.expenses_paid,
            minerals_extracted: totals.operations.production_quantity,
            total_spent: totals.financial.total_spent,
            ready_to_pay: totals.payment_plan.ready_total,
            ready_count: totals.payment_plan.ready_count,
            pending_total: totals.payment_plan.pending_total,
            pending_count: totals.payment_plan.pending_count,
            week_gross_payroll: totals.periods.week.fixed_payroll_gross,
            week_net_payroll: totals.periods.week.fixed_payroll_net,
            week_flexible_work: totals.periods.week.flexible_work_value,
            week_expenses: totals.periods.week.expenses_total,
            week_food: totals.periods.week.food_total
        };
    }));
    return { ...data, total_companies: companyIds.length, total_managers: managerId ? 1 : managers.length, total_accountants: (accountants || []).filter(row => !managerId || row.employees.manager_user_id === managerId).length, managers, comparison, selected_manager_user_id: managerId };
};

const getManagerDashboard = async (user) => aggregate(requireCompanyIds(user), requireManagerUserId(user));
const getAccountantDashboard = async (user) => aggregate(requireCompanyIds(user), requireManagerUserId(user));
module.exports = { getOwnerDashboard, getAccountantDashboard, getManagerDashboard };
