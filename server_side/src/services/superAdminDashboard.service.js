const supabase = require("../config/supabase");

const getSuperAdminDashboard = async () => {

    // ===============================
    // TOTAL COUNTS
    // ===============================

    const { count: totalCompanies } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true });

    const { count: totalEmployees } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true });

    const { count: totalUsers } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

    // OWNER ROLE

    const { data: ownerRole } = await supabase
        .from("roles")
        .select("role_id")
        .eq("role_name", "OWNER")
        .single();

    let totalOwners = 0;

    if (ownerRole) {

        const { count } = await supabase
            .from("users")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("role_id", ownerRole.role_id);

        totalOwners = count || 0;

    }

    // ===============================
    // RECENT COMPANIES
    // ===============================

    const { data: companies } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", {
            ascending: false
        })
        .limit(5);

    const recentCompanies = [];

    for (const company of companies || []) {

        const { data: employee } = await supabase
            .from("employees")
            .select(`
                first_name,
                last_name,
                users(role_id)
            `)
            .eq("company_id", company.company_id);

        let owner = "Not Assigned";

        if (employee) {

            const emp = employee.find(e =>
                e.users &&
                e.users.role_id === ownerRole.role_id
            );

            if (emp) {
                owner =
                    emp.first_name +
                    " " +
                    emp.last_name;
            }

        }

        const { count } = await supabase
            .from("employees")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("company_id", company.company_id);

        recentCompanies.push({

            company_id: company.company_id,

            company_name: company.company_name,

            province: company.province,

            owner,

            employees: count || 0,

            status: "Active",

            created_at: company.created_at

        });

    }

    // ===============================
    // GROWTH
    // ===============================

    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ];

    const companiesGrowth = [];

    for (let i = 0; i < 12; i++) {

        const start = new Date(
            new Date().getFullYear(),
            i,
            1
        );

        const end = new Date(
            new Date().getFullYear(),
            i + 1,
            1
        );

        const { count } = await supabase
            .from("companies")
            .select("*", {
                count: "exact",
                head: true
            })
            .gte(
                "created_at",
                start.toISOString()
            )
            .lt(
                "created_at",
                end.toISOString()
            );

        companiesGrowth.push({

            label: months[i],

            value: count || 0

        });

    }

    // ===============================
    // SYSTEM HEALTH
    // ===============================

    const systemHealth = [

        {
            id: "backend",
            name: "Backend",
            status: "Online"
        },

        {
            id: "database",
            name: "Database",
            status: "Online"
        },

        {
            id: "api",
            name: "API",
            status: "Online"
        },

        {
            id: "storage",
            name: "Storage",
            status: "Online"
        }

    ];

    // ===============================
    // RECENT ACTIVITY
    // ===============================

    const recentActivities = (companies || []).map(company => ({

        id: company.company_id,

        event: "Company Registered",

        company: company.company_name,

        date: company.created_at,

        user: "Super Admin"

    }));

    return {

        total_companies: totalCompanies || 0,

        total_owners: totalOwners,

        total_users: totalUsers || 0,

        total_employees: totalEmployees || 0,

        companies_growth: companiesGrowth,

        recent_companies: recentCompanies,

        recent_activities: recentActivities,

        system_health: systemHealth

    };

};

module.exports = {
    getSuperAdminDashboard
};