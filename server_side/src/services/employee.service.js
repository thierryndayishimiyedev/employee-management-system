const supabase = require("../config/supabase");
const { scopeByCompany } = require("../utils/companyScope");

const getEmployeesForAttendance = async (user) => {
    const query = scopeByCompany(supabase
        .from("employees")
        .select("employee_id, employee_code, first_name, last_name")
        .order("first_name", { ascending: true }), user);

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return data || [];
};

module.exports = {
    getEmployeesForAttendance
};
