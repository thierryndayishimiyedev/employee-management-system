require("dotenv").config();
const supabase = require("../src/config/supabase");
const { createFoodSupplier } = require("../src/services/foodSupplier.service");
const { createFoodSupply, reviewFoodSupply, payFoodSupply } = require("../src/services/foodSupply.service");

const stamp = Date.now();
let created = {};
const cleanup = async () => {
    if (created.supplyId) await supabase.from("food_supply_payments").delete().eq("food_supply_id", created.supplyId);
    if (created.supplyId) await supabase.from("food_supplies").delete().eq("food_supply_id", created.supplyId);
    if (created.supplierId) await supabase.from("food_suppliers").delete().eq("supplier_id", created.supplierId);
    if (created.userId) await supabase.from("users").delete().eq("user_id", created.userId);
};

(async () => {
    const { data: company, error: companyError } = await supabase.from("companies").select("company_id").limit(1).single();
    if (companyError) throw new Error("No test company is available.");
    const { data: manager, error: managerError } = await supabase.from("users").select("user_id, employees!inner(company_id), roles!inner(role_name)").eq("employees.company_id", company.company_id).eq("roles.role_name", "MANAGER").limit(1).single();
    if (managerError) throw new Error("No manager is available for the test company.");
    const { data: assignment, error: assignmentError } = await supabase.from("company_owners").select("owner_user_id").eq("company_id", company.company_id).not("owner_user_id", "is", null).limit(1).single();
    if (assignmentError) throw new Error("No normalized owner assignment is available for the test company.");

    const managerUser = { user_id: manager.user_id, role_name: "MANAGER", company_ids: [company.company_id] };
    const ownerUser = { user_id: assignment.owner_user_id, role_name: "OWNER", company_ids: [company.company_id] };
    const supplier = await createFoodSupplier({ supplier_name: `Food Test ${stamp}`, username: `food.test.${stamp}`, password: "FoodTest123!" }, managerUser);
    created = { supplierId: supplier.supplier_id, userId: supplier.user_id };
    const supplierUser = { user_id: supplier.user_id, role_name: "FOOD_SUPPLIER", company_ids: [company.company_id] };
    const supply = await createFoodSupply({ supply_date: "2099-01-06", notes: "temporary integration test", items: [{ food_name: "Tomatoes", quantity: 2, unit: "kg", unit_price: 1200 }] }, supplierUser);
    created.supplyId = supply.food_supply_id;
    await reviewFoodSupply(supply.food_supply_id, "approve", "Verified", managerUser);
    await reviewFoodSupply(supply.food_supply_id, "approve", "Approved", ownerUser);
    const paid = await payFoodSupply(supply.food_supply_id, ownerUser);
    if (paid.payment_status !== "PAID" || paid.status !== "PAID") throw new Error("Food supply was not marked paid.");
    let duplicateBlocked = false;
    try { await payFoodSupply(supply.food_supply_id, ownerUser); } catch { duplicateBlocked = true; }
    if (!duplicateBlocked) throw new Error("Duplicate food payment was not blocked.");
    const { data: payment } = await supabase.from("food_supply_payments").select("amount,payment_status,provider_name").eq("food_supply_id", supply.food_supply_id).single();
    if (!payment || Number(payment.amount) !== 2400 || payment.provider_name !== "INTERNAL_TEST") throw new Error("Food payment ledger is incorrect.");
    console.log(JSON.stringify({ success: true, total: payment.amount, provider: payment.provider_name, duplicate_payment_blocked: duplicateBlocked }, null, 2));
})().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await cleanup(); });
