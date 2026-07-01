const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

const login = async ({ username, password }) => {

    // Find admin by username
    const { data: admin, error } = await supabase
        .from("admins")
        .select("*")
        .eq("username", username)
        .single();

    if (error || !admin) {
        throw new Error("Invalid username or password.");
    }

    // Check password
    const passwordMatch = await bcrypt.compare(
        password,
        admin.password
    );

    if (!passwordMatch) {
        throw new Error("Invalid username or password.");
    }

    // Generate JWT
    const token = jwt.sign(
        {
            admin_id: admin.admin_id,
            username: admin.username
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );

    delete admin.password;

    return {
        token,
        admin
    };

};

module.exports = {
    login
};