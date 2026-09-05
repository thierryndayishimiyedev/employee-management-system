const { randomUUID } = require("crypto");
const supabase = require("../config/supabase");
const { isSuperAdmin, resolveAuthorizedCompanyId, scopeByCompany } = require("../utils/companyScope");
const { scopeByManager, resolveManagerForWrite, assertManagerInCompany } = require("../utils/managerScope");
const { normalizeMtnRwandaPhone } = require("../utils/rwandaPhone");
const { getPaymentProvider } = require("./paymentProviders");

const validCategories = new Set(["MATERIAL", "EQUIPMENT", "FUEL", "TOOL", "OTHER"]);
const validBuyerRoles = new Set(["OWNER", "MANAGER", "ACCOUNTANT", "OTHER"]);
const number = (value) => Number(value || 0);

const listExpenses = async (user) => {
    let query = supabase.from("operational_expenses").select("*").order("expense_date", { ascending: false }).order("created_at", { ascending: false });
    query = scopeByCompany(query, user); query = scopeByManager(query, user);
    const { data, error } = await query; if (error) throw error;
    return data || [];
};

const getExpense = async (id, user) => {
    const expense = (await listExpenses(user)).find((row) => row.expense_id === id);
    if (!expense) throw new Error("Expense was not found in your operational scope.");
    return expense;
};

const createExpense = async (payload, user) => {
    if (user.role_name !== "ACCOUNTANT" && !isSuperAdmin(user)) throw new Error("Only the assigned accountant can record an expense or material purchase.");
    const company_id = resolveAuthorizedCompanyId(user, payload.company_id);
    const manager_user_id = resolveManagerForWrite(user, payload.manager_user_id);
    if (!manager_user_id) throw new Error("A manager is required for this expense.");
    await assertManagerInCompany(manager_user_id, company_id);
    const quantity = number(payload.quantity); const unit_price = number(payload.unit_price);
    const expense_category = String(payload.expense_category || "OTHER").toUpperCase();
    const buyer_role = String(payload.buyer_role || "OTHER").toUpperCase();
    if (!payload.expense_date || Number.isNaN(Date.parse(payload.expense_date))) throw new Error("A valid expense date is required.");
    if (!String(payload.item_name || "").trim()) throw new Error("Enter the material, fuel, tool, or expense name.");
    if (!quantity || quantity <= 0 || unit_price < 0) throw new Error("Quantity must be positive and unit price cannot be negative.");
    if (!validCategories.has(expense_category) || !validBuyerRoles.has(buyer_role)) throw new Error("Choose a valid expense category and buyer role.");
    if (!String(payload.buyer_name || "").trim()) throw new Error("Enter the buyer or supplier name.");
    const buyer_phone = normalizeMtnRwandaPhone(payload.buyer_phone);
    const { data, error } = await supabase.from("operational_expenses").insert([{
        company_id, manager_user_id, expense_date: payload.expense_date, expense_category,
        item_name: payload.item_name.trim(), quantity, unit: String(payload.unit || "item").trim() || "item", unit_price,
        total_amount: quantity * unit_price, buyer_role, buyer_name: payload.buyer_name.trim(), buyer_phone,
        notes: String(payload.notes || "").trim() || null, recorded_by: user.user_id || null
    }]).select().single();
    if (error) throw error; return data;
};

const reviewExpense = async (id, decision, comments, user) => {
    const expense = await getExpense(id, user); const now = new Date().toISOString(); let update;
    if (user.role_name === "MANAGER") {
        if (!['PENDING_MANAGER', 'CHANGES_REQUESTED'].includes(expense.approval_status)) throw new Error("This expense is not awaiting manager approval.");
        update = decision === "approve" ? { approval_status: "PENDING_OWNER", manager_approved_by: user.user_id, manager_approved_at: now, manager_comments: comments || null } : { approval_status: "CHANGES_REQUESTED", manager_comments: comments || "Changes requested" };
    } else if (user.role_name === "OWNER" || isSuperAdmin(user)) {
        if (expense.approval_status !== "PENDING_OWNER") throw new Error("This expense must be manager-approved before final owner approval.");
        update = decision === "approve" ? { approval_status: "OWNER_APPROVED", owner_approved_by: user.user_id || null, owner_approved_at: now, owner_comments: comments || null } : { approval_status: "CHANGES_REQUESTED", owner_comments: comments || "Changes requested" };
    } else throw new Error("Only the manager or owner may review this expense.");
    let query = supabase.from("operational_expenses").update({ ...update, updated_at: now }).eq("expense_id", id);
    query = scopeByManager(query, user); const { data, error } = await query.select().single(); if (error) throw error; return data;
};

const payExpense = async (id, user) => {
    if (user.role_name !== "OWNER" && !isSuperAdmin(user)) throw new Error("Only the owner may pay an approved expense.");
    const expense = await getExpense(id, user);
    if (expense.approval_status !== "OWNER_APPROVED" || expense.payment_status === "PAID") throw new Error("Only a final-approved, unpaid expense can be paid.");
    const { data: existing, error: existingError } = await supabase.from("operational_expense_payments").select("expense_payment_id").eq("expense_id", id).maybeSingle();
    if (existingError) throw existingError; if (existing) throw new Error("This expense already has a payment record.");
    const reference = `EXP-${randomUUID()}`; const now = new Date().toISOString();
    try {
        const transaction = await getPaymentProvider().processPayment({ reference_id: reference, amount: number(expense.total_amount), receiver_phone: expense.buyer_phone, phone: expense.buyer_phone });
        const { error: paymentError } = await supabase.from("operational_expense_payments").insert([{ expense_id: id, company_id: expense.company_id, manager_user_id: expense.manager_user_id, amount: expense.total_amount, receiver_name: expense.buyer_name, receiver_phone: expense.buyer_phone, payment_status: "PAID", provider_name: transaction.provider || "INTERNAL", transaction_reference: transaction.reference_id || reference, provider_response: transaction, paid_by: user.user_id || null, paid_at: now }]);
        if (paymentError) throw paymentError;
        const { data, error } = await supabase.from("operational_expenses").update({ payment_status: "PAID", payment_reference: transaction.reference_id || reference, payment_provider: transaction.provider || "INTERNAL", paid_by: user.user_id || null, paid_at: now, payment_failure_reason: null, updated_at: now }).eq("expense_id", id).select().single();
        if (error) throw error; return data;
    } catch (error) {
        await supabase.from("operational_expenses").update({ payment_status: "FAILED", payment_failure_reason: error.message, updated_at: now }).eq("expense_id", id);
        throw error;
    }
};

module.exports = { listExpenses, createExpense, reviewExpense, payExpense };
