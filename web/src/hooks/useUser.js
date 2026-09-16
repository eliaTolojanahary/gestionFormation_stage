import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

export function useUser() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function getUsers() {
    setIsLoading(true)
    setError('')
    try {
      const response = await apiRequest('/utilisateurs')
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

  function searchUsers(searchTerm) {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    return users.filter((user) => [user.nom, user.prenom, user.email, user.telephone].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch))
  }

  function createUser(userData) {
    return apiRequest('/utilisateurs', { method: 'POST', body: JSON.stringify(userData) })
  }

  function updateUser(id, userData) {
    return apiRequest(`/utilisateurs/${id}`, { method: 'PUT', body: JSON.stringify(userData) })
  }

  async function deleteUser(id) {
    const response = await apiRequest(`/utilisateurs/${id}`, { method: 'DELETE' })
    setUsers((current) => current.filter((user) => user.id_utilisateur !== Number(id)))
    return response
  }

  useEffect(() => {
    getUsers()
  }, [])

  return { users, isLoading, error, getUsers, getUser, searchUsers, createUser, updateUser, deleteUser }
}