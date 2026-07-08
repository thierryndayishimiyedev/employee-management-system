const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyId } = require("../utils/companyScope");

const assertPayrollAccess = async (payroll_id, user) => {

    if (isSuperAdmin(user)) return;

    const { data: payroll, error } = await supabase
        .from("payroll")
        .select(`
            payroll_id,
            employees!inner(company_id)
        `)
        .eq("payroll_id", payroll_id)
        .eq("employees.company_id", requireCompanyId(user))
        .maybeSingle();

    if (error || !payroll)
        throw new Error("Payroll not found for your company.");

};

const approvePayroll = async (payroll_id, user) => {

    await assertPayrollAccess(payroll_id, user);

    const { data, error } = await supabase
        .from("payroll")
        .update({
            payment_status: "APPROVED"
        })
        .eq("payroll_id", payroll_id)
        .select()
        .single();

    if (error) throw error;

    return data;

};

const rejectPayroll = async (payroll_id, user) => {

    await assertPayrollAccess(payroll_id, user);

    const { data, error } = await supabase
        .from("payroll")
        .update({
            payment_status: "FAILED"
        })
        .eq("payroll_id", payroll_id)
        .select()
        .single();

    if (error) throw error;

    return data;

};

module.exports = {
    approvePayroll,
    rejectPayroll
};
