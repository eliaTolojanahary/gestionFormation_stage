import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

export const STATUTS_ASSISTANCE = {
  EN_ATTENTE: 'En attente',
  RESOLU: 'Résolu',
}

// Demandes d'assistance envoyées par les étudiants depuis l'application mobile
export function useAssistance() {
  const [demandes, setDemandes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function getDemandes() {
    setIsLoading(true)
    setError('')
    try {
      const result = await apiRequest('/assistances')
      setDemandes(result.data || [])
    } catch (requestError) {
      setError(requestError.message || "Impossible de charger les demandes d'assistance.")
    } finally {
      setIsLoading(false)
    }
  }

  // Marque la demande comme résolue (l'étudiant est notifié par le serveur) et met la liste à jour
  async function resoudreDemande(id) {
    const result = await apiRequest(`/assistances/${id}/resoudre`, { method: 'PUT' })
    setDemandes((liste) => liste.map((d) => (d.id_assistance === id ? result.data : d)))
    return result.data
  }

  useEffect(() => { getDemandes() }, [])

  return { demandes, isLoading, error, getDemandes, resoudreDemande }
}
