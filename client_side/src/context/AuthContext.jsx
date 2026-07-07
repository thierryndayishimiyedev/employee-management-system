import { useMemo, useState } from "react";
import api from "../api/api";
import { AuthContext } from "./authStore";
import { normalizeUser } from "./authUtils";

export function AuthProvider({ children }) {

    const [user, setUser] = useState(() => {

        const saved = localStorage.getItem("user");

        if (!saved) {
            return null;
        }

        try {
            const parsed = JSON.parse(saved);
            const normalized = normalizeUser(parsed);

            if (!normalized?.role_name) {
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                return null;
            }

            return normalized;
        } catch {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            return null;
        }

    });

    const login = async (username, password, portal = "admin") => {

        const endpoint =
            portal === "owner"
                ? "/owner-auth/login"
                : "/auth/login";

        const response = await api.post(endpoint, {
            username,
            password
        });

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        const token = response.data.data.token;
        const loggedUser = normalizeUser(response.data.data.user);

        localStorage.setItem("token", token);
        localStorage.setItem(
            "user",
            JSON.stringify(loggedUser)
        );

        setUser(loggedUser);

        return response.data;

    };

    const logout = () => {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);

    };

    const value = useMemo(() => ({

        user,

        isAuthenticated: !!user,

        login,

        logout

    }), [user]);

    return (

        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>

    );

}

