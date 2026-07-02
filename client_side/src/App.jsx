import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import OwnerLoginPage from "./pages/OwnerLoginPage";

import DashboardPage from "./pages/DashboardPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";

import "./App.css";

function App() {

    return (

        <Routes>

            <Route
                path="/"
                element={<Navigate to="/login" replace />}
            />

            <Route
                path="/login"
                element={<LoginPage />}
            />

            <Route
                path="/owner/login"
                element={<OwnerLoginPage />}
            />

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute
                        allowedRoles={["SUPER_ADMIN"]}
                        redirectTo="/login"
                    >
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/owner/dashboard"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER"]}
                        redirectTo="/owner/login"
                    >
                        <OwnerDashboardPage />
                    </ProtectedRoute>
                }
            />

        </Routes>

    );

}

export default App;