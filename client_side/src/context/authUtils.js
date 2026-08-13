export const normalizeUser = (user) => {
    if (!user) return null;

    const roleName =
        user.role_name ||
        user.roles?.role_name ||
        user.role ||
        user.roles?.[0]?.role_name;

    if (!roleName) {
        return null;
    }

    return {
        ...user,
        role_name: roleName
    };
};
