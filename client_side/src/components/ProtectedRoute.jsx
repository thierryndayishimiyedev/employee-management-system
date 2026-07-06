import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
    children,
    allowedRoles = [],
    redirectTo = "/login"
}) {

    const {
        isAuthenticated,
        user
    } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    if (
        allowedRoles.length &&
        !allowedRoles.includes(user?.role_name)
    ) {
        return <Navigate to={redirectTo} replace />;
    }

    return children;

}