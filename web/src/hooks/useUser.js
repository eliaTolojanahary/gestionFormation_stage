import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

// Hook des comptes utilisateurs. Liste chargée au montage et à chaque changement de
// `etat` ('actif' par défaut, 'inactif' ou 'tous'), sauf avec { charger: false } (la page
// Utilisateurs pagine elle-même par le serveur et n'utilise ici que les actions).
// { role: 'Formateur' } : seulement les comptes de ce rôle (sinon, les étudiants aussi : liste énorme).
export function useUser(etat = 'actif', { charger = true, role } = {}) {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function getUsers() {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ etat })
      if (role) params.set('role', role)
      const response = await apiRequest(`/utilisateurs?${params}`)
      const data = response.data || []
      setUsers(data)
      return data
    } catch (requestError) {
      setError(requestError.message || 'Impossible de charger les utilisateurs.')
      return []
    } finally {
      setIsLoading(false)
    }
  }

  async function getUser(id) {
    const response = await apiRequest(`/utilisateurs/${id}`)
    return response.data
  }

  // Recherche locale (sans appel API) dans nom, prénom, e-mail et téléphone
  function searchUsers(searchTerm) {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    return users.filter((user) => [user.nom, user.prenom, user.email, user.telephone].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch))
  }

  // userData est un FormData (la photo peut être jointe)
  function createUser(userData) {
    return apiRequest('/utilisateurs', { method: 'POST', body: userData })
  }

  function updateUser(id, userData) {
    return apiRequest(`/utilisateurs/${id}`, { method: 'PUT', body: userData })
  }

  // Désactiver / réactiver : la page recharge ensuite la liste (le compte change de filtre)
  function deleteUser(id) {
    return apiRequest(`/utilisateurs/${id}`, { method: 'DELETE' })
  }

  function reactiverUser(id) {
    return apiRequest(`/utilisateurs/${id}/reactiver`, { method: 'PUT' })
  }

  useEffect(() => {
    if (charger) getUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat, charger, role])

  return { users, isLoading, error, getUsers, getUser, searchUsers, createUser, updateUser, deleteUser, reactiverUser }
}