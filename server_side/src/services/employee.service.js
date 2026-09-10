const supabase = require("../config/supabase");
const { scopeByCompany } = require("../utils/companyScope");
const { scopeByManager } = require("../utils/managerScope");

const getEmployeesForAttendance = async (user) => {
    // Flexible workers use their own daily-rate ledger and must never be
    // offered by the fixed attendance register or bulk "all present" action.
    let query = supabase
        .from("employees")
        .select("employee_id, employee_code, first_name, last_name, company_id, manager_user_id, payment_type")
        .eq("is_worker", true)
        .eq("payment_type", "FIXED_DAILY")
        .order("first_name", { ascending: true });
    query = scopeByCompany(query, user);
    // The attendance worker picker must never offer an accountant or manager
    // somebody else's worker. Owners remain company-wide by design.
    query = scopeByManager(query, user, "manager_user_id");

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
};

module.exports = {
    getEmployeesForAttendance
};
