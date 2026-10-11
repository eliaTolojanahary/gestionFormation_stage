import { useState } from 'react'
import { apiRequest, clearSession, readStoredToken, readStoredUser, storeSession, storeUser } from '../utils/api'

export { readStoredToken, readStoredUser }

// Hook d'authentification : utilisateur connecté, connexion / déconnexion, mots de passe et sessions.
// Comme les autres hooks du dossier, il expose des états (isLoading, error) et des fonctions
// qui appellent l'API via apiRequest.
export function useAuth() {
  // Au chargement de la page, on reprend l'utilisateur déjà stocké (session existante)
  const [user, setUser] = useState(readStoredUser)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Connexion : stocke token + utilisateur ; renvoie l'utilisateur, ou null en cas d'échec (voir `error`)
  async function login(email, password, rememberMe) {
    setError('')
    setIsLoading(true)

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), mot_de_passe: password }),
      })
      storeSession(data, rememberMe)
      setUser(data.user)
      return data.user
    } catch (requestError) {
      setError(requestError.message || 'Impossible de contacter le serveur.')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Déconnexion : désactive la session côté serveur puis efface les données locales
  async function logout() {
    try {
      if (readStoredToken()) {
        await apiRequest('/auth/logout', { method: 'POST' })
      }
    } catch {
      // Même si le serveur ne répond pas, on déconnecte localement
    }
    clearSession()
    setUser(null)
  }

  // Demande l'envoi d'un code de réinitialisation par e-mail
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

  // Nouveau mot de passe à partir du code reçu par e-mail
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

  // Fusionne les infos modifiées (profil) dans l'utilisateur courant. L'API peut renvoyer
  // id_utilisateur / role_nom au lieu de id / role : on normalise.
  function updateCurrentUser(updatedUser) {
    const nextUser = {
      ...user,
      ...updatedUser,
      id: updatedUser?.id || updatedUser?.id_utilisateur || user?.id,
      role: updatedUser?.role || updatedUser?.role_nom || user?.role,
    }
    storeUser(nextUser)
    setUser(nextUser)
    return nextUser
  }

  // Les fonctions suivantes relancent l'erreur (throw) : c'est la page qui l'affiche

  // Changement de mot de passe (les autres appareils sont déconnectés par le serveur)
  async function changePassword(ancienMotDePasse, nouveauMotDePasse) {
    setError('')
    try {
      return await apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          ancien_mot_de_passe: ancienMotDePasse,
          nouveau_mot_de_passe: nouveauMotDePasse,
        }),
      })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de modifier le mot de passe.')
      throw requestError
    }
  }

  // Appareils connectés au compte
  async function getSessions() {
    setError('')
    try {
      const data = await apiRequest('/auth/sessions', { method: 'GET' })
      return data.sessions || []
    } catch (requestError) {
      setError(requestError.message || 'Impossible de récupérer les sessions.')
      throw requestError
    }
  }

  async function getLastLogin() {
    setError('')
    try {
      const data = await apiRequest('/auth/last-login', { method: 'GET' })
      return data.lastLogin || null
    } catch (requestError) {
      setError(requestError.message || 'Impossible de récupérer la dernière connexion.')
      throw requestError
    }
  }

  // Déconnecte tous les autres appareils
  async function logoutAll() {
    setError('')
    try {
      return await apiRequest('/auth/logout-all', { method: 'PUT' })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de déconnecter les sessions.')
      throw requestError
    }
  }

  return {
    user, isLoading, error,
    login, logout, forgotPassword, resetPassword, changePassword, updateCurrentUser,
    logoutAll, getLastLogin, getSessions,
  }
}
