const supabase = require("../config/supabase");
const { isSuperAdmin, requireCompanyId } = require("../utils/companyScope");

const assertAdvanceAccess = async (advance_id, user) => {

    if (isSuperAdmin(user)) return;

    const { data: advance, error } = await supabase
        .from("salary_advances")
        .select(`
            advance_id,
            employees!inner(company_id)
        `)
        .eq("advance_id", advance_id)
        .eq("employees.company_id", requireCompanyId(user))
        .maybeSingle();

    if (error || !advance)
        throw new Error("Advance not found for your company.");

};

const approveAdvance = async (advance_id, user) => {

    await assertAdvanceAccess(advance_id, user);

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
        .from("salary_advances")
        .update({
            status: "APPROVED",
            approval_date: today
        })
        .eq("advance_id", advance_id)
        .select()
        .single();

    if (error) throw error;

    return data;
};

module.exports = { approveAdvance };
