import { useState } from 'react'
import { apiRequest } from '../utils/api'

// Hook des supports de cours et de leurs commentaires.
// Les erreurs sont relancées (throw) pour que le composant puisse les afficher.
export function useSupport() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function getSupports(formationId) {
    setError('')
    try {
      const result = await apiRequest(`/formations/${formationId}/supports`)
      return result.data || []
    } catch (requestError) {
      setError(requestError.message || 'Impossible de charger les supports.')
      throw requestError
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

  // Supports programmés (brouillons pas encore envoyés) du formateur connecté
  async function getSupportsProgrammes() {
    setError('')
    try {
      const result = await apiRequest('/supports/programmes')
      return result.data || []
    } catch (requestError) {
      setError(requestError.message || 'Impossible de charger les supports programmés.')
      throw requestError
    }
  }

  // formData : titre, date_envoi_prevue et / ou nouveau fichier ("fichier")
  async function updateSupportProgramme(supportId, formData) {
    setIsLoading(true)
    setError('')
    try {
      return await apiRequest(`/supports/${supportId}`, { method: 'PUT', body: formData })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de modifier le support programmé.')
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }

  // Envoie tout de suite un support programmé
  async function envoyerSupport(supportId) {
    setIsLoading(true)
    setError('')
    try {
      return await apiRequest(`/supports/${supportId}/envoyer`, { method: 'POST' })
    } catch (requestError) {
      setError(requestError.message || "Impossible d'envoyer le support.")
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }

  async function deleteSupport(supportId) {
    setIsLoading(true)
    setError('')
    try {
      return await apiRequest(`/supports/${supportId}`, { method: 'DELETE' })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de supprimer le support.')
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }

  async function getCommentaires(supportId) {
    setError('')
    try {
      const result = await apiRequest(`/supports/${supportId}/commentaires`)
      return result.data || result.commentaires || []
    } catch (requestError) {
      setError(requestError.message || 'Impossible de charger les commentaires.')
      throw requestError
    }
  }

  // mentions = id_etudiant des étudiants mentionnés avec @ ; idParent = commentaire auquel on répond
  async function createCommentaire(supportId, contenu, mentions = [], idParent = null) {
    setIsLoading(true)
    setError('')
    try {
      return await apiRequest('/commentaires', {
        method: 'POST',
        body: JSON.stringify({
          id_support: supportId,
          id_parent: idParent,
          contenu,
          mentions,
        }),
      })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de publier le commentaire.')
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }

  async function deleteCommentaire(commentaireId) {
    setIsLoading(true)
    setError('')
    try {
      return await apiRequest(`/commentaires/${commentaireId}`, { method: 'DELETE' })
    } catch (requestError) {
      setError(requestError.message || 'Impossible de supprimer le commentaire.')
      throw requestError
    } finally {
      setIsLoading(false)
    }
  }


  return {
    isLoading,
    error,
    getSupports,
    uploadSupport,
    getSupportsProgrammes,
    updateSupportProgramme,
    envoyerSupport,
    deleteSupport,
    getCommentaires,
    createCommentaire,
    deleteCommentaire,
  }
}