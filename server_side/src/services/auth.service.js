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

const resolveUserRoleName = async (user) => {
    if (user?.roles?.role_name) {
        return user.roles.role_name;
    }

    if (!user?.role_id) {
        return null;
    }

    const { data: role, error } = await supabase
        .from("roles")
        .select("role_name")
        .eq("role_id", user.role_id)
        .maybeSingle();

    if (error || !role) {
        return null;
    }

    return role.role_name;
};

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
            employees(*),
            food_suppliers!food_suppliers_user_id_fkey(*)
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

    const resolvedRole = await resolveUserRoleName(user);
    const companyIds = [];

    if (user.employees?.company_id) {
        companyIds.push(user.employees.company_id);
    }
    if (user.food_suppliers?.company_id) {
        companyIds.push(user.food_suppliers.company_id);
    }

    if (resolvedRole === "OWNER") {
        const { data: ownerAssignments } = await supabase
            .from("company_owners")
            .select("company_id")
            .eq("owner_user_id", user.user_id)
            .order("created_at", { ascending: true });

        let assignments = ownerAssignments || [];
        // Preserve access for legacy assignments not yet backfilled, but never
        // use username when a normalized owner_user_id relationship exists.
        if (!assignments.length) {
            const { data: legacyAssignments } = await supabase
                .from("company_owners")
                .select("company_id")
                .is("owner_user_id", null)
                .eq("username", username)
                .order("created_at", { ascending: true });
            assignments = legacyAssignments || [];
        }

        if (assignments.length) {
            // At least one company assignment is available; this keeps multi-company owner access working.
            assignments.forEach((assignment) => {
                if (assignment.company_id) {
                    companyIds.push(assignment.company_id);
                }
            });
        }
    }

    const normalizedCompanyIds = [...new Set(companyIds.filter(Boolean))];
    const token = jwt.sign(
        {
            user_id: user.user_id,
            employee_id: user.employee_id,
            company_id: normalizedCompanyIds[0] || user.employees?.company_id || user.food_suppliers?.company_id,
            company_ids: normalizedCompanyIds,
            role_name: resolvedRole || user.roles?.role_name
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
            role_name: resolvedRole || user.roles?.role_name
        }
    };

};

module.exports = {
    login
};
