import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { AuthContext } from "./authStore";
import { normalizeUser } from "./authUtils";

export function AuthProvider({ children }) {

    const [user, setUser] = useState(() => {

        // Authentication lives only for this browser session. Closing the app
        // removes it; preferences such as language remain in local storage.
        const saved = sessionStorage.getItem("user");

        if (!saved) {
            return null;
        }

        try {
            const parsed = JSON.parse(saved);
            const normalized = normalizeUser(parsed);

            if (!normalized?.role_name) {
                sessionStorage.removeItem("user");
                sessionStorage.removeItem("token");
                return null;
            }

            return normalized;
        } catch {
            sessionStorage.removeItem("user");
            sessionStorage.removeItem("token");
            return null;
        }

    });

    const login = async (username, password, portal = "admin", expectedRole = null) => {

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

        // The role picker is a real access check, not merely a dashboard
        // shortcut. Do this before saving a session so a mismatched account
        // never becomes authenticated in this browser.
        if (expectedRole && loggedUser?.role_name !== expectedRole) {
            throw new Error(`This account is assigned to ${String(loggedUser?.role_name || 'another').replace('_', ' ')}. Select the matching account type and try again.`);
        }

        sessionStorage.setItem("token", token);
        sessionStorage.setItem(
            "user",
            JSON.stringify(loggedUser)
        );

        setUser(loggedUser);

        return response.data;

    };

    const logout = () => {

        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        // Remove old persistent credentials from earlier app versions.
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);

    };

    useEffect(() => {
        if (!user) return undefined;
        const idleMs = 30 * 60 * 1000;
        let timeout;
        const reset = () => { clearTimeout(timeout); timeout = setTimeout(logout, idleMs); };
        ["pointerdown", "keydown", "scroll", "touchstart"].forEach((event) => window.addEventListener(event, reset, { passive: true }));
        reset();
        return () => { clearTimeout(timeout); ["pointerdown", "keydown", "scroll", "touchstart"].forEach((event) => window.removeEventListener(event, reset)); };
    }, [user]);

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

