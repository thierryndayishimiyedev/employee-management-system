

import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import OwnerLoginPage from "./pages/OwnerLoginPage";

import DashboardPage from "./pages/DashboardPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
import WorkersPage from "./pages/WorkersPage";
import AttendancePage from "./pages/AttendancePage";
import PayrollPage from "./pages/PayrollPage";

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
                        allowedRoles={["SUPER_ADMIN", "MANAGER", "ACCOUNTANT"]}
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

            <Route
                path="/workers"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER"]}
                        redirectTo="/owner/login"
                    >
                        <WorkersPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="*"
                element={<Navigate to="/login" replace />}
            />

            <Route
    path="/attendance"
    element={
        <ProtectedRoute
            allowedRoles={["OWNER"]}
            redirectTo="/owner/login"
        >
            <AttendancePage />
        </ProtectedRoute>
    }
/>

<Route
    path="/payroll"
    element={
        <ProtectedRoute
            allowedRoles={["OWNER"]}
            redirectTo="/owner/login"
        >
            <PayrollPage />
        </ProtectedRoute>
    }
/>

        </Routes>

        

    );

}

export default App;