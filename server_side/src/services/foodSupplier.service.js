const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyIds, resolveAuthorizedCompanyId, scopeByCompany } = require("../utils/companyScope");
const { normalizeRwandaPhone } = require("../utils/rwandaPhone");

const createFoodSupplier = async (payload, user) => {
    const company_id = resolveAuthorizedCompanyId(user, payload.company_id);
    if (!payload.supplier_name?.trim() || !payload.username?.trim() || !payload.password) {
        throw new Error("Supplier name, username, and password are required.");
    }
    if (String(payload.password).length < 8) throw new Error("Supplier password must contain at least 8 characters.");
    const { data: role, error: roleError } = await supabase.from("roles").select("role_id").eq("role_name", "FOOD_SUPPLIER").single();
    if (roleError || !role) throw new Error("FOOD_SUPPLIER role is missing. Run the food migration first.");
    const { data: existing } = await supabase.from("users").select("user_id").eq("username", payload.username.trim()).maybeSingle();
    if (existing) throw new Error("That username is already in use.");
    const { data: account, error: accountError } = await supabase.from("users").insert([{
        role_id: role.role_id, username: payload.username.trim(), password: await bcrypt.hash(payload.password, 10), is_active: true
    }]).select().single();
    if (accountError) throw accountError;
    const { data, error } = await supabase.from("food_suppliers").insert([{
        user_id: account.user_id, company_id, supplier_name: payload.supplier_name.trim(),
        phone: payload.phone ? normalizeRwandaPhone(payload.phone) : null, email: payload.email || null, created_by: user.user_id
    }]).select().single();
    if (error) { await supabase.from("users").delete().eq("user_id", account.user_id); throw error; }
    return { ...data, username: account.username };
};

const getFoodSuppliers = async (user) => {
    let query = supabase.from("food_suppliers").select("supplier_id, company_id, supplier_name, phone, email, active, created_at, users(username)").order("created_at", { ascending: false });
    if (user.role_name === "FOOD_SUPPLIER") query = query.eq("user_id", user.user_id);
    else if (!isSuperAdmin(user)) query = query.in("company_id", requireCompanyIds(user));
    const { data, error } = await query; if (error) throw error; return data || [];
};

module.exports = { createFoodSupplier, getFoodSuppliers };
