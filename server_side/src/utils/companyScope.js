const isSuperAdmin = (user) => user?.role_name === "SUPER_ADMIN";

const requireCompanyId = (user) => {
    if (isSuperAdmin(user)) return null;
    if (!user?.company_id) throw new Error("Company scope missing from authenticated user.");
    return user.company_id;
};

const scopeByCompany = (query, user, column = "company_id") => {
    const companyId = requireCompanyId(user);
    return companyId ? query.eq(column, companyId) : query;
};

const assertCompanyAccess = (record, user, column = "company_id") => {
    const companyId = requireCompanyId(user);
    if (companyId && record?.[column] !== companyId) {
        throw new Error("Forbidden: record belongs to another company.");
    }
};

module.exports = {
    isSuperAdmin,
    requireCompanyId,
    scopeByCompany,
    assertCompanyAccess
};
