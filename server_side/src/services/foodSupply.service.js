const { randomUUID } = require("crypto");
const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyIds, scopeByCompany } = require("../utils/companyScope");
const { getPaymentProvider } = require("./paymentProviders");
const { scopeByManager, assertManagerInCompany } = require("../utils/managerScope");

const totalOf = (items) => items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
const validItems = (items) => Array.isArray(items) && items.length && items.every((i) => i.food_name?.trim() && Number(i.quantity) > 0 && Number(i.unit_price) >= 0 && i.unit?.trim());

const supplierForUser = async (user) => {
    const { data, error } = await supabase.from("food_suppliers").select("*").eq("user_id", user.user_id).eq("active", true).maybeSingle();
    if (error || !data) throw new Error("Food supplier account is not active.");
    return data;
};

const createFoodSupply = async ({ supply_date, notes, items, manager_user_id }, user) => {
    const supplier = await supplierForUser(user);
    if (!manager_user_id) throw new Error("Select the manager receiving this supply.");
    await assertManagerInCompany(manager_user_id, supplier.company_id);
    if (!supply_date || Number.isNaN(Date.parse(supply_date))) throw new Error("A valid supply date is required.");
    if (!validItems(items)) throw new Error("Each food item needs a name, positive quantity, unit, and valid unit price.");
    const { data: supply, error } = await supabase.from("food_supplies").insert([{
        company_id: supplier.company_id, supplier_id: supplier.supplier_id, manager_user_id, supply_date, notes: notes || null, status: "PENDING_MANAGER"
    }]).select().single();
    if (error) throw error;
    const rows = items.map((item) => ({ food_supply_id: supply.food_supply_id, food_name: item.food_name.trim(), quantity: Number(item.quantity), unit: item.unit.trim(), unit_price: Number(item.unit_price) }));
    const { error: itemError } = await supabase.from("food_supply_items").insert(rows);
    if (itemError) { await supabase.from("food_supplies").delete().eq("food_supply_id", supply.food_supply_id); throw itemError; }
    return { ...supply, items: rows, total_amount: totalOf(rows) };
};

const listFoodSupplies = async (user) => {
    let query = supabase.from("food_supplies").select("*, food_suppliers!inner(supplier_name, company_id), food_supply_items(*)").order("supply_date", { ascending: false });
    if (user.role_name === "FOOD_SUPPLIER") {
        const supplier = await supplierForUser(user); query = query.eq("supplier_id", supplier.supplier_id);
    } else if (!isSuperAdmin(user)) query = query.in("company_id", requireCompanyIds(user));
    query = scopeByManager(query, user);
    const { data, error } = await query; if (error) throw error;
    return (data || []).map((supply) => ({ ...supply, total_amount: totalOf(supply.food_supply_items || []) }));
};

const getSupply = async (id, user) => {
    const rows = await listFoodSupplies(user); const supply = rows.find((item) => item.food_supply_id === id);
    if (!supply) throw new Error("Food supply not found for your company."); return supply;
};

const reviewFoodSupply = async (id, decision, comments, user) => {
    const supply = await getSupply(id, user); const now = new Date().toISOString(); let update;
    if (isSuperAdmin(user)) update = decision === "approve" ? { status: "OWNER_APPROVED", owner_approved_by: user.user_id || null, owner_approved_at: now, owner_comments: comments || null } : { status: "CHANGES_REQUESTED", owner_comments: comments || "Changes requested" };
    else if (user.role_name === "MANAGER") {
        if (!['PENDING_MANAGER', 'CHANGES_REQUESTED'].includes(supply.status)) throw new Error("This food supply is not awaiting manager verification.");
        update = decision === "approve" ? { status: "PENDING_OWNER", manager_approved_by: user.user_id, manager_approved_at: now, manager_comments: comments || null } : { status: "CHANGES_REQUESTED", manager_comments: comments || "Changes requested" };
    } else if (user.role_name === "OWNER") {
        if (supply.status !== "PENDING_OWNER") throw new Error("Food supply must be manager-verified before owner approval.");
        update = decision === "approve" ? { status: "OWNER_APPROVED", owner_approved_by: user.user_id, owner_approved_at: now, owner_comments: comments || null } : { status: "CHANGES_REQUESTED", owner_comments: comments || "Changes requested" };
    } else throw new Error("Only a manager or owner can review food supplies.");
    let updateQuery = supabase.from("food_supplies").update({ ...update, updated_at: now }).eq("food_supply_id", id);
    updateQuery = scopeByManager(updateQuery, user);
    const { data, error } = await updateQuery.select().single(); if (error) throw error; return data;
};

const payFoodSupply = async (id, user) => {
    if (!isSuperAdmin(user) && user.role_name !== "OWNER") throw new Error("Only an owner may pay a food supply.");
    const supply = await getSupply(id, user);
    if (supply.status !== "OWNER_APPROVED" || supply.payment_status === "PAID") throw new Error("Only an owner-approved, unpaid food supply can be paid.");
    const { data: existing } = await supabase.from("food_supply_payments").select("food_supply_payment_id").eq("food_supply_id", id).maybeSingle();
    if (existing) throw new Error("This food supply has already been paid.");
    const amount = totalOf(supply.food_supply_items || []); if (amount <= 0) throw new Error("A food supply must contain payable items.");
    const reference = `FOOD-${randomUUID()}`; const transaction = await getPaymentProvider().processPayment({ reference_id: reference, amount }); const now = new Date().toISOString();
    const { error: paymentError } = await supabase.from("food_supply_payments").insert([{ food_supply_id: id, company_id: supply.company_id, supplier_id: supply.supplier_id, amount, payment_status: "PAID", provider_name: "INTERNAL_TEST", transaction_reference: transaction.reference_id || reference, provider_response: transaction, paid_by: user.user_id || null, paid_at: now }]);
    if (paymentError) throw paymentError;
    const { data, error } = await supabase.from("food_supplies").update({ status: "PAID", payment_status: "PAID", payment_reference: transaction.reference_id || reference, payment_provider: "INTERNAL_TEST", paid_by: user.user_id || null, paid_at: now, updated_at: now }).eq("food_supply_id", id).select().single(); if (error) throw error; return data;
};

const payAllFoodSupplies = async ({ manager_user_id } = {}, user) => {
    if (!isSuperAdmin(user) && user.role_name !== "OWNER") throw new Error("Only an owner may pay food supplies.");
    const eligible = (await listFoodSupplies(user)).filter((row) => row.status === "OWNER_APPROVED" && row.payment_status !== "PAID" && (!manager_user_id || row.manager_user_id === manager_user_id));
    const failed = []; let paid = 0;
    for (const row of eligible) { try { await payFoodSupply(row.food_supply_id, user); paid += 1; } catch (error) { failed.push({ food_supply_id: row.food_supply_id, message: error.message }); } }
    return { total: eligible.length, paid, failed };
};

const foodSupplyCsv = async (user) => {
    const supplies = await listFoodSupplies(user);
    const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [["Supply date", "Supplier", "Items", "Total RWF", "Workflow status", "Payment status", "Payment reference"]
        .map(quote).join(",")];
    for (const supply of supplies) {
        lines.push([
            supply.supply_date,
            supply.food_suppliers?.supplier_name || "",
            (supply.food_supply_items || []).map((item) => `${item.food_name}: ${item.quantity} ${item.unit} × ${item.unit_price}`).join("; "),
            supply.total_amount,
            supply.status,
            supply.payment_status,
            supply.payment_reference || ""
        ].map(quote).join(","));
    }
    return lines.join("\n");
};

module.exports = { createFoodSupply, listFoodSupplies, reviewFoodSupply, payFoodSupply, payAllFoodSupplies, foodSupplyCsv };
