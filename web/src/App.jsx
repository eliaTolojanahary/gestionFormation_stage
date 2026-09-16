import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import './App.css'

function App() {
  const { user, isLoading, error, login, logout } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login onLogin={login} isLoading={isLoading} error={error} />
          )
        }
      />
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />
      <Route
        path="/dashboard/*"
        element={
          user ? (
            <DashboardLayout user={user} onLogout={logout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  )
}

export default App