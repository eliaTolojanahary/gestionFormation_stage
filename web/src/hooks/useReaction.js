import { useState } from 'react'
import { apiRequest } from '../utils/api'

// Hook des réactions sur un support. Après chaque ajout / retrait, la liste à jour est rechargée et renvoyée.
export function useReaction() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function getReactions(supportId) {
    const result = await apiRequest(`/supports/${supportId}/reactions`)
    return result.data || []
  }

  // Ajoute ou remplace la réaction de l'utilisateur (typeReaction = 'like', 'coeur', 'utile', 'dislike')
  async function react(supportId, typeReaction) {
    setIsLoading(true)
    setError('')
    try {
      await apiRequest(`/supports/${supportId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ type_reaction: typeReaction }),
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
