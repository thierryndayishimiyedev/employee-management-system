import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import OwnerLoginPage from "./pages/OwnerLoginPage";

import DashboardPage from "./pages/DashboardPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
import ManagerDashboardPage from "./pages/ManagerDashboardPage";
import AccountantDashboardPage from "./pages/AccountantDashboardPage";
import MinesPage from "./pages/MinePage";
import AttendancePage from "./pages/AttendancePage";
import OwnerResourcePage from "./pages/OwnerResourcePage";
import ManagementPage from "./pages/ManagementPage";
import DownloadCenterPage from "./pages/DownloadCenterPage";

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

            <Route
                path="/manager/dashboard"
                element={
                    <ProtectedRoute
                        allowedRoles={["MANAGER"]}
                        redirectTo="/login"
                    >
                        <ManagerDashboardPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/accountant/dashboard"
                element={
                    <ProtectedRoute
                        allowedRoles={["ACCOUNTANT"]}
                        redirectTo="/login"
                    >
                        <AccountantDashboardPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/mines"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER"]}
                        redirectTo="/owner/login"
                    >       
                <MinesPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/departments"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER"]}
                        redirectTo="/owner/login"
                    >
                        <OwnerResourcePage resource="departments" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/positions"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER"]}
                        redirectTo="/owner/login"
                    >
                        <OwnerResourcePage resource="positions" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/production"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER", "MANAGER", "ACCOUNTANT"]}
                        redirectTo="/owner/login"
                    >
                        <OwnerResourcePage resource="production" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/attendance"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER", "MANAGER", "ACCOUNTANT"]}
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
                        allowedRoles={["OWNER", "ACCOUNTANT"]}
                        redirectTo="/owner/login"
                    >
                        <ManagementPage resource="payrolls" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/companies"
                element={
                    <ProtectedRoute
                        allowedRoles={["SUPER_ADMIN"]}
                        redirectTo="/login"
                    >
                        <ManagementPage resource="companies" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admins"
                element={
                    <ProtectedRoute
                        allowedRoles={["SUPER_ADMIN"]}
                        redirectTo="/login"
                    >
                        <ManagementPage resource="admins" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/owners"
                element={
                    <ProtectedRoute
                        allowedRoles={["SUPER_ADMIN"]}
                        redirectTo="/login"
                    >
                        <ManagementPage resource="owners" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/managers"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER"]}
                        redirectTo="/login"
                    >
                        <ManagementPage resource="managers" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/workers"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER", "MANAGER"]}
                        redirectTo="/owner/login"
                    >
                        <ManagementPage resource="workers" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/accountants"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER"]}
                        redirectTo="/login"
                    >
                        <ManagementPage resource="accountants" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/roles"
                element={
                    <ProtectedRoute
                        allowedRoles={["SUPER_ADMIN", "OWNER", "MANAGER", "ACCOUNTANT"]}
                        redirectTo="/login"
                    >
                        <ManagementPage resource="roles" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/advances"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER", "ACCOUNTANT"]}
                        redirectTo="/owner/login"
                    >
                        <ManagementPage resource="advances" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/payments"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER"]}
                        redirectTo="/owner/login"
                    >
                        <ManagementPage resource="payments" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/reports"
                element={
                    <ProtectedRoute
                        allowedRoles={["OWNER", "ACCOUNTANT", "MANAGER"]}
                        redirectTo="/owner/login"
                    >
                        <ManagementPage resource="reports" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/downloads"
                element={
                    <ProtectedRoute
                        allowedRoles={["SUPER_ADMIN", "OWNER", "ACCOUNTANT", "MANAGER"]}
                        redirectTo="/login"
                    >
                        <DownloadCenterPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="*"
                element={<Navigate to="/login" replace />}
            />

        </Routes>


    );

}

export default App;
