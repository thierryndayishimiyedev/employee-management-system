const isSuperAdmin = (user) => user?.role_name === "SUPER_ADMIN";

const normalizeCompanyIds = (user) => {
    if (!user) return [];

    const rawIds = [];

    if (Array.isArray(user.company_ids)) {
        rawIds.push(...user.company_ids);
    }

    if (Array.isArray(user.company_id)) {
        rawIds.push(...user.company_id);
    }

    if (user.company_id && !Array.isArray(user.company_id)) {
        rawIds.push(user.company_id);
    }

    return [...new Set(rawIds.filter(Boolean))];
};

const requireCompanyId = (user) => {
    if (isSuperAdmin(user)) return null;

    const companyIds = normalizeCompanyIds(user);

    if (!companyIds.length) {
        throw new Error("Company scope missing from authenticated user.");
    }

    return companyIds[0];
};

const requireCompanyIds = (user) => {
    if (isSuperAdmin(user)) return [];

    const companyIds = normalizeCompanyIds(user);

    if (!companyIds.length) {
        throw new Error("Company scope missing from authenticated user.");
    }

    return companyIds;
};

const scopeByCompany = (query, user, column = "company_id") => {
    if (isSuperAdmin(user)) return query;

    const companyIds = requireCompanyIds(user);

    if (!companyIds.length) return query;

    return query.in(column, companyIds);
};

const resolveAuthorizedCompanyId = (user, companyId) => {
    if (isSuperAdmin(user)) {
        if (!companyId) throw new Error("Company is required.");
        return companyId;
    }

    const companyIds = requireCompanyIds(user);
    if (companyId && !companyIds.includes(companyId)) {
        throw new Error("Forbidden: company does not belong to your assigned companies.");
    }
    return companyId || companyIds[0];
};

// Use this for resources scoped through an embedded employee/company relation.
// It deliberately uses every company assigned to an owner, not just the first.
const scopeByRelatedCompany = (query, user, relation = "employees") => {
    if (isSuperAdmin(user)) return query;

    return query.in(`${relation}.company_id`, requireCompanyIds(user));
};

const assertCompanyAccess = (record, user, column = "company_id") => {
    if (isSuperAdmin(user)) return;

    const companyIds = requireCompanyIds(user);

    if (record && companyIds.length && !companyIds.includes(record?.[column])) {
        throw new Error("Forbidden: record belongs to another company.");
    }
};

module.exports = {
    isSuperAdmin,
    requireCompanyId,
    requireCompanyIds,
    resolveAuthorizedCompanyId,
    scopeByCompany,
    scopeByRelatedCompany,
    assertCompanyAccess
};
