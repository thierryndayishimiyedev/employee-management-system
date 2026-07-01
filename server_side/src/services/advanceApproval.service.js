const supabase = require("../config/supabase");

const approveAdvance = async (advance_id) => {

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