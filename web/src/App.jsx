import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import './App.css'

// Routes principales : /login et /forgot-password sont publiques, /dashboard/* exige d'être connecté.
// Un utilisateur connecté qui ouvre /login est renvoyé vers le tableau de bord, et inversement.
// Lien vers une fiche ouvert sans être connecté (ex. /dashboard/etudiants/12) : après la
// connexion, on revient sur cette fiche (adresse gardée dans state.depuis).
function App() {
  const { user, isLoading, error, login, logout, updateCurrentUser } = useAuth()
  const location = useLocation()
  const depuis = location.state?.depuis
  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={depuis || '/dashboard'} replace />
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
            <DashboardLayout user={user} onLogout={logout} updateCurrentUser={updateCurrentUser} />
          ) : (
            <Navigate
              to="/login"
              replace
              state={location.pathname !== '/dashboard' ? { depuis: location.pathname + location.search } : undefined}
            />
          )
        }
      />
      {/* Toute autre URL : redirection selon l'état de connexion */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  )
}

export default App