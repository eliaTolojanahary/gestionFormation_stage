import { useState } from 'react'
import { apiRequest } from '../utils/api'

export function useSupport() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function getSupports(formationId) {
    const result = await apiRequest(`/formations/${formationId}/supports`)
    return result.data || []
  }

  async function getCommentaires(supportId) {
    const result = await apiRequest(`/supports/${supportId}/commentaires`)
    return result.data || []
  }

  async function createCommentaire(supportId, contenu) {
    setIsLoading(true)
    setError('')
    try {
      return await apiRequest('/commentaires', {
        method: 'POST',
        body: JSON.stringify({ id_support: supportId, contenu }),
      })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de publier le commentaire.')
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }

  async function uploadSupport(formData) {
    setIsLoading(true)
    setError('')
    try {
      return await apiRequest('/supports', { method: 'POST', body: formData })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de déposer le support.')
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, error, getSupports, getCommentaires, createCommentaire, uploadSupport }
}
