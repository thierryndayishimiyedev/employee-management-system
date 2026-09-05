const { isSuperAdmin } = require("./companyScope");
const supabase = require("../config/supabase");

const requiresManagerScope = (user) => ["MANAGER", "ACCOUNTANT"].includes(user?.role_name);

const requireManagerUserId = (user) => {
    if (!requiresManagerScope(user)) return null;
    const managerId = user.role_name === "MANAGER" ? user.user_id : user.manager_user_id;
    if (!managerId) throw new Error("Manager assignment missing from authenticated user. Please sign in again.");
    return managerId;
};

const scopeByManager = (query, user, column = "manager_user_id") => {
    if (isSuperAdmin(user) || !requiresManagerScope(user)) return query;
    return query.eq(column, requireManagerUserId(user));
};

const resolveManagerForWrite = (user, requestedManagerId) => {
    if (requiresManagerScope(user)) {
        const managerId = requireManagerUserId(user);
        if (requestedManagerId && requestedManagerId !== managerId) {
            throw new Error("Forbidden: manager does not match your operational unit.");
        }
        return managerId;
    }
    return requestedManagerId || null;
};

const assertEmployeeManager = (employee, user) => {
    if (!requiresManagerScope(user)) return;
    if (!employee?.manager_user_id || employee.manager_user_id !== requireManagerUserId(user)) {
        throw new Error("Forbidden: employee belongs to another manager.");
    }
};

const assertManagerInCompany = async (managerUserId, companyId) => {
    const { data, error } = await supabase
        .from("users")
        .select("user_id, roles!inner(role_name), employees!fk_user_employee!inner(company_id)")
        .eq("user_id", managerUserId)
        .eq("roles.role_name", "MANAGER")
        .eq("employees.company_id", companyId)
        .maybeSingle();
    if (error || !data) throw new Error("Selected manager was not found in this company.");
    return data;
};

module.exports = { requiresManagerScope, requireManagerUserId, scopeByManager, resolveManagerForWrite, assertEmployeeManager, assertManagerInCompany };
