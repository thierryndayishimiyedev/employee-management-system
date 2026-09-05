const supabase = require("../config/supabase");
const { scopeByCompany } = require("../utils/companyScope");
const { scopeByManager } = require("../utils/managerScope");

const getEmployeesForAttendance = async (user) => {
    // Workers no longer require login accounts; is_worker is the explicit
    // operational marker for the attendance, payroll, and item selectors.
    let query = supabase
        .from("employees")
        .select("employee_id, employee_code, first_name, last_name, company_id, manager_user_id")
        .eq("is_worker", true)
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
