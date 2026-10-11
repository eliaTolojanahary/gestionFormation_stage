import { useCallback, useState } from 'react'
import { apiRequest } from '../utils/api'

// Hook du profil de l'utilisateur connecté (lecture et modification).
export function useProfil() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Profil de base (/auth/profil) complété par la fiche utilisateur complète (/utilisateurs/:id)
  const getProfil = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await apiRequest('/auth/profil')
      const profile = data.user || data.data
      const userId = profile?.id_utilisateur || profile?.id

      if (!userId) return profile

      const userData = await apiRequest(`/utilisateurs/${userId}`)
      return { ...profile, ...(userData.data || {}) }
    } catch (requestError) {
      setError(requestError.message || 'Impossible de charger le profil.')
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfil = useCallback(async (id, profile) => {
    setIsLoading(true)
    setError('')
    try {
      return await apiRequest(`/utilisateurs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(profile),
      })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de modifier le profil.')
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { getProfil, updateProfil, isLoading, error }
}
