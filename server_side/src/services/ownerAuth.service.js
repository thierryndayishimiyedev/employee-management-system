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
        .single();

    if (error || !user)
        throw new Error("Invalid username or password.");

    if (user.roles.role_name !== "OWNER")
        throw new Error("Unauthorized.");

    const match = await bcrypt.compare(password, user.password);

    if (!match)
        throw new Error("Invalid username or password.");

    const token = jwt.sign(
        {
            user_id: user.user_id,
            employee_id: user.employee_id,
            company_id: user.employees.company_id,
            role: "OWNER"
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    delete user.password;

    return {
        token,
        user
    };

};

module.exports = {
    ownerLogin
};