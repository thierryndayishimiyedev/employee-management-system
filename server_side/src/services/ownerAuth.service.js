const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

const ownerLogin = async ({ username, password }) => {

    const { data: user, error } = await supabase
        .from("users")
        .select(` 
            *,
            roles(role_name),
            employees(*)
        `)
        .eq("username", username)
        .maybeSingle();

    if (error || !user)
        throw new Error("Invalid username or password.");

    const roleName = user.roles?.role_name || "OWNER";

    if (roleName !== "OWNER")
        throw new Error("Unauthorized.");

    const match = await bcrypt.compare(password, user.password);

    if (!match)
        throw new Error("Invalid username or password.");

    const companyIds = [];

    if (user.employees?.company_id) {
        companyIds.push(user.employees.company_id);
    }

    const { data: ownerAssignments } = await supabase
        .from("company_owners")
        .select("company_id")
        .eq("username", username)
        .order("created_at", { ascending: true });

    if (ownerAssignments?.length) {
        ownerAssignments.forEach((assignment) => {
            if (assignment.company_id) {
                companyIds.push(assignment.company_id);
            }
        });
    }

    const normalizedCompanyIds = [...new Set(companyIds.filter(Boolean))];

    const token = jwt.sign(
        {
            user_id: user.user_id,
            employee_id: user.employee_id,
            company_id: normalizedCompanyIds[0] || user.employees?.company_id,
            company_ids: normalizedCompanyIds,
            role_name: "OWNER"
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    delete user.password;

    return {
        token,
        user: {
            ...user,
            role_name: "OWNER",
            company_ids: normalizedCompanyIds
        }
    };

};

module.exports = {
    ownerLogin
};