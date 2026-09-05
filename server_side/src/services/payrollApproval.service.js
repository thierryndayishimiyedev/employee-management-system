const supabase = require("../config/supabase");
const { isSuperAdmin, scopeByRelatedCompany } = require("../utils/companyScope");
const { scopeByManager } = require("../utils/managerScope");

const getScopedPayroll = async (id, user) => {
    let query = scopeByRelatedCompany(supabase.from("payroll").select("*, employees!inner(company_id, manager_user_id)").eq("payroll_id", id), user);
    query = scopeByManager(query, user, "employees.manager_user_id");
    const { data, error } = await query.maybeSingle();
    if (error || !data) throw new Error("Payroll not found for your company.");
    return data;
};

const reviewPayroll = async (id, decision, reason, user) => {
    const payroll = await getScopedPayroll(id, user);
    const now = new Date().toISOString();
    let update;
    if (isSuperAdmin(user)) {
        update = decision === "approve" ? { approval_status: "OWNER_APPROVED", payment_status: "APPROVED", owner_approved_at: now, locked_at: now } : { approval_status: "CHANGES_REQUESTED", owner_rejected_at: now, owner_rejection_reason: reason || null };
    } else if (user.role_name === "MANAGER") {
        if (payroll.approval_status !== "GENERATED" && payroll.approval_status !== "CHANGES_REQUESTED") throw new Error("Payroll is not awaiting manager review.");
        update = decision === "approve" ? { approval_status: "MANAGER_APPROVED", manager_approved_by: user.user_id, manager_approved_at: now } : { approval_status: "CHANGES_REQUESTED", manager_rejected_by: user.user_id, manager_rejected_at: now, manager_rejection_reason: reason || null };
    } else if (user.role_name === "OWNER") {
        if (payroll.approval_status !== "MANAGER_APPROVED") throw new Error("Payroll must be manager-approved before owner approval.");
        update = decision === "approve" ? { approval_status: "OWNER_APPROVED", payment_status: "APPROVED", owner_approved_by: user.user_id, owner_approved_at: now, locked_at: now } : { approval_status: "CHANGES_REQUESTED", owner_rejected_by: user.user_id, owner_rejected_at: now, owner_rejection_reason: reason || null };
    } else throw new Error("Only a manager, owner, or super admin may review payroll.");
    let updateQuery = supabase.from("payroll").update(update).eq("payroll_id", id);
    updateQuery = scopeByManager(updateQuery, user);
    const { data, error } = await updateQuery.select().single();
    if (error) throw error;
    return data;
};
module.exports = { reviewPayroll };
