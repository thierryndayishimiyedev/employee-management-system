const { randomUUID } = require("crypto");
const supabase = require("../config/supabase");
const { isSuperAdmin, scopeByRelatedCompany } = require("../utils/companyScope");
const { getPaymentProvider } = require("./paymentProviders");
const { normalizeRwandaPhone } = require("../utils/rwandaPhone");

const getScopedAdvance = async (id, user) => {
    const { data, error } = await scopeByRelatedCompany(supabase.from("salary_advances").select("*, employees!inner(company_id, phone, first_name, last_name, status)").eq("advance_id", id), user).maybeSingle();
    if (error || !data) throw new Error("Advance not found for your company.");
    return data;
};

const reviewAdvance = async (id, decision, reason, user) => {
    const advance = await getScopedAdvance(id, user);
    const now = new Date().toISOString();
    let update;
    if (isSuperAdmin(user)) update = decision === "approve" ? { status: "OWNER_APPROVED", owner_approved_at: now, approval_date: now.slice(0, 10) } : { status: "CHANGES_REQUESTED", owner_rejection_reason: reason || null };
    else if (user.role_name === "MANAGER") {
        if (!["PENDING", "PENDING_MANAGER", "CHANGES_REQUESTED"].includes(advance.status)) throw new Error("Advance is not awaiting manager review.");
        update = decision === "approve" ? { status: "PENDING_OWNER", manager_approved_by: user.user_id, manager_approved_at: now } : { status: "CHANGES_REQUESTED", manager_rejection_reason: reason || null };
    } else if (user.role_name === "OWNER") {
        if (advance.status !== "PENDING_OWNER") throw new Error("Advance must be manager-approved before owner approval.");
        update = decision === "approve" ? { status: "OWNER_APPROVED", owner_approved_by: user.user_id, owner_approved_at: now, approval_date: now.slice(0, 10) } : { status: "CHANGES_REQUESTED", owner_rejection_reason: reason || null };
    } else throw new Error("Only a manager, owner, or super admin may review an advance.");
    const { data, error } = await supabase.from("salary_advances").update(update).eq("advance_id", id).select().single();
    if (error) throw error;
    return data;
};

const payAdvance = async (id, user) => {
    if (!isSuperAdmin(user) && user.role_name !== "OWNER") throw new Error("Only an owner may pay an advance.");
    const advance = await getScopedAdvance(id, user);
    if (advance.status !== "OWNER_APPROVED") throw new Error("Advance must be owner-approved before payment.");
    if (advance.payment_status === "PAID") throw new Error("Advance has already been paid.");
    if (!advance.employees?.phone || Number(advance.amount) <= 0) throw new Error("Advance employee phone and amount are required for payment.");
    const receiverPhone = normalizeRwandaPhone(advance.employees.phone);
    const reference = `ADV-${randomUUID()}`;
    const transaction = await getPaymentProvider().processPayment({ reference_id: reference, amount: advance.amount, receiver_phone: receiverPhone });
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("salary_advances").update({
        status: "OWNER_APPROVED", payment_status: "PAID", payment_date: now, amount_paid: advance.amount,
        remaining_balance: advance.remaining_balance == null ? advance.amount : advance.remaining_balance,
        payment_reference: transaction.reference_id || reference, payment_provider: "INTERNAL"
    }).eq("advance_id", id).select().single();
    if (error) throw error;
    return data;
};
module.exports = { reviewAdvance, payAdvance };
