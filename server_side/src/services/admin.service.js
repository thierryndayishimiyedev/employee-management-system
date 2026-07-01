const bcrypt = require("bcrypt");
const supabase = require("../config/supabase");

const createAdmin = async (adminData) => {

    const {
        username,
        password,
        full_name,
        phone,
        email
    } = adminData;

    // Check if username already exists
    const { data: existingAdmin } = await supabase
        .from("admins")
        .select("admin_id")
        .eq("username", username)
        .single();

    if (existingAdmin) {
        throw new Error("Username already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert admin
    const { data, error } = await supabase
        .from("admins")
        .insert([
            {
                username,
                password: hashedPassword,
                full_name,
                phone,
                email
            }
        ])
        .select();

    if (error) {
        throw error;
    }

    return data;
};

module.exports = {
    createAdmin
};