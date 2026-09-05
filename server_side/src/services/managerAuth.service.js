const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

const managerLogin = async ({ username, password }) => {

    const { data: user, error } = await supabase
        .from("users")
        .select(`
            *,
            roles(role_name),
            employees!fk_user_employee(*)
        `)
        .eq("username", username)
        .single();

    if (error || !user)
        throw new Error("Invalid username or password.");

    if (user.roles.role_name !== "MANAGER")
        throw new Error("Unauthorized.");

    const match = await bcrypt.compare(password, user.password);

    if (!match)
        throw new Error("Invalid username or password.");

    const token = jwt.sign(
        {
            user_id: user.user_id,
            employee_id: user.employee_id,
            company_id: user.employees.company_id,
            manager_user_id: user.user_id,
            role_name: "MANAGER",
            username: user.username,
            display_name: [user.employees?.first_name, user.employees?.last_name].filter(Boolean).join(" ") || user.username
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    delete user.password;

    return {
        token,
        user: {
            ...user,
            role_name: user.roles?.role_name || "MANAGER"
        }
    };

};

module.exports = { managerLogin };
