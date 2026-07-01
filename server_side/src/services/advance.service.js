const supabase = require("../config/supabase");

const requestAdvance = async (data) => {

    const {
        employee_id,
        amount,
        reason
    } = data;

    const today = new Date();

    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const { data: payroll, error } = await supabase
        .from("payroll")
        .select("net_salary")
        .eq("employee_id", employee_id)
        .eq("payroll_month", month)
        .eq("payroll_year", year)
        .single();

    if (error || !payroll)
        throw new Error("Generate payroll first.");

    const { data: advances } = await supabase
        .from("salary_advances")
        .select("amount")
        .eq("employee_id", employee_id)
        .eq("status","APPROVED");

    const taken = advances.reduce(
        (sum,a)=>sum+Number(a.amount),0
    );

    const maxAdvance = payroll.net_salary / 2;

    if (taken + Number(amount) > maxAdvance)
        throw new Error("Advance exceeds allowed limit.");

    const { data: advance, error: advanceError } = await supabase
        .from("salary_advances")
        .insert([{
            employee_id,
            amount,
            reason,
            request_date: today,
            status:"PENDING"
        }])
        .select()
        .single();

    if (advanceError) throw advanceError;

    return advance;

};

module.exports = { requestAdvance };