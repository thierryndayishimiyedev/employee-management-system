import { createContext, useContext, useMemo, useState } from "react";
import api from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

    const [user, setUser] = useState(() => {

        const saved = localStorage.getItem("user");

        return saved ? JSON.parse(saved) : null;

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
        const loggedUser = response.data.data.user;

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

export function useAuth() {

    const context = useContext(AuthContext);

    if (!context) {

        throw new Error(
            "useAuth must be used inside AuthProvider."
        );

    }

    return context;

}