import { useState } from 'react'
import { apiRequest } from '../utils/api'


export function readStoredUser() {
  const storedUser =
    localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user')
  return storedUser ? JSON.parse(storedUser) : null
}

export function readStoredToken() {
  return (
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('auth_token') ||
    null
  )
}

export function useAuth() {
  const [user, setUser] = useState(readStoredUser)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function login(email, password, rememberMe) {
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_URL_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), mot_de_passe: password }),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.message || 'Identifiants incorrects.')

      const storage = rememberMe ? localStorage : sessionStorage
      if (data.token) storage.setItem('auth_token', data.token)
      if (data.user) storage.setItem('auth_user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } catch (requestError) {
      setError(requestError.message || 'Impossible de contacter le serveur.')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_user')
    setUser(null)
  }

  async function forgotPassword(email) {
    setError('')
    try {
      return await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de demander la réinitialisation.')
      return null
    }
  }

  async function resetPassword(token, nouveauMotDePasse) {
    setError('')
    try {
      return await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, nouveau_mot_de_passe: nouveauMotDePasse }),
      })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de réinitialiser le mot de passe.')
      return null
    }
  }

  return { user, isLoading, error, login, logout, forgotPassword, resetPassword }
}
