import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import OwnerDashboardPage from './pages/OwnerDashboardPage'
import OwnerLoginPage from './pages/OwnerLoginPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/owner/login" element={<OwnerLoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ 'ADMIN' ]} redirectTo="/login">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ 'OWNER' ]} redirectTo="/owner/login">
            <OwnerDashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
