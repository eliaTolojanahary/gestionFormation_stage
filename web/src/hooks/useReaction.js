import { useState } from 'react'
import { apiRequest } from '../utils/api'

export function useReaction() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function getReactions(supportId) {
    const result = await apiRequest(`/supports/${supportId}/reactions`)
    return result.data || []
  }

  async function react(supportId, reactionId) {
    setIsLoading(true)
    setError('')
    try {
      await apiRequest(`/supports/${supportId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ id_type_reaction: reactionId }),
      })
      return getReactions(supportId)
    } catch (requestError) {
      setError(requestError.message || 'Impossible d’enregistrer la réaction.')
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }

  async function removeReaction(supportId) {
    setIsLoading(true)
    setError('')
    try {
      await apiRequest(`/supports/${supportId}/reactions`, { method: 'DELETE' })
      return getReactions(supportId)
    } catch (requestError) {
      setError(requestError.message || 'Impossible de retirer la réaction.')
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, error, getReactions, react, removeReaction }
}
