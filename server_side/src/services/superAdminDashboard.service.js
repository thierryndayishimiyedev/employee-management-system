const supabase = require("../config/supabase");

const getSuperAdminDashboard = async () => {

    // TOTAL COMPANIES
    const { data: companies } = await supabase
        .from("companies")
        .select("company_id");

    // TOTAL OWNERS
    const { data: owners } = await supabase
        .from("owners")
        .select("owner_id");

    // TOTAL USERS
    const { data: users } = await supabase
        .from("users")
        .select("user_id");

    // TOTAL EMPLOYEES
    const { data: employees } = await supabase
        .from("employees")
        .select("employee_id");

    // RECENT COMPANIES
    const { data: recentCompanies } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

    return {
        total_companies: companies?.length || 0,
        total_owners: owners?.length || 0,
        total_users: users?.length || 0,
        total_employees: employees?.length || 0,
        recent_companies: recentCompanies || []
    };

};

module.exports = {
    getSuperAdminDashboard
};