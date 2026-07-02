// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const supabase = require("../config/supabase");

// const login = async ({ username, password }) => {

//     // Find admin by username
//     const { data: admin, error } = await supabase
//         .from("admins")
//         .select("*")
//         .eq("username", username)
//         .single();

//     if (error || !admin) {
//         throw new Error("Invalid username or password.");
//     }

//     // Check password
//     const passwordMatch = await bcrypt.compare(
//         password,
//         admin.password
//     );

//     if (!passwordMatch) {
//         throw new Error("Invalid username or password.");
//     }

//     // Generate JWT
//     const token = jwt.sign(
//         {
//             admin_id: admin.admin_id,
//             username: admin.username
//         },
//         process.env.JWT_SECRET,
//         {
//             expiresIn: "1d"
//         }
//     );

//     delete admin.password;

//     return {
//         token,
//         admin
//     };

// };

// module.exports = {
//     login
// };



const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

const login = async ({ username, password }) => {

    // FIRST TRY ADMINS

    const { data: admin } = await supabase
        .from("admins")
        .select("*")
        .eq("username", username)
        .maybeSingle();

    if (admin) {

        const match = await bcrypt.compare(
            password,
            admin.password
        );

        if (!match) {
            throw new Error("Invalid username or password.");
        }

        const token = jwt.sign(
            {
                admin_id: admin.admin_id,
                role_name: "SUPER_ADMIN"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        delete admin.password;

        return {
            token,
            user: {
                ...admin,
                role_name: "SUPER_ADMIN"
            }
        };

    }

    // THEN TRY USERS TABLE

    const { data: user } = await supabase
        .from("users")
        .select(`
            *,
            roles(role_name),
            employees(*)
        `)
        .eq("username", username)
        .maybeSingle();

    if (!user) {
        throw new Error("Invalid username or password.");
    }

    const match = await bcrypt.compare(
        password,
        user.password
    );

    if (!match) {
        throw new Error("Invalid username or password.");
    }

    const token = jwt.sign(
        {
            user_id: user.user_id,
            employee_id: user.employee_id,
            company_id: user.employees.company_id,
            role_name: user.roles.role_name
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    );

    delete user.password;

    return {
        token,
        user: {
            ...user,
            role_name: user.roles.role_name
        }
    };

};

module.exports = {
    login
};