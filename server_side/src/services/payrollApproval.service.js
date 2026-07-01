const supabase = require("../config/supabase");

const approvePayroll = async (payroll_id) => {

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

module.exports = {
    approvePayroll
};