import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

// Libellés affichés pour les statuts de paiement renvoyés par l'API
export const STATUTS_PAIEMENT = {
  en_attente: 'En attente',
  valide: 'Validé',
  refuse: 'Refusé',
}

// Hook des paiements : liste (chargée au montage), saisie par le personnel, validation / refus.
export function usePaiement() {
  const [paiements, setPaiements] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function getPaiements() {
    setIsLoading(true)
    setError('')
    try {
      const result = await apiRequest('/paiements')
      const data = result.data || []
      setPaiements(data)
      return data
    } catch (requestError) {
      setError(requestError.message || 'Impossible de charger les paiements.')
      return []
    } finally {
      setIsLoading(false)
    }
  }

  async function getPaiement(id) {
    const result = await apiRequest(`/paiements/${id}`)
    return result.data
  }

  // Paiement saisi par le personnel (validé directement), puis rechargement de la liste
  async function createPaiement(payload) {
    const result = await apiRequest('/paiements', { method: 'POST', body: JSON.stringify(payload) })
    await getPaiements()
    return result
  }

  // Validation / refus d'un paiement envoyé par un étudiant depuis l'app mobile
  async function changerStatut(id, action) {
    const result = await apiRequest(`/paiements/${id}/${action}`, { method: 'PUT' })
    setPaiements((liste) =>
      liste.map((p) => (p.id_paiement === id ? { ...p, statut: result.data.statut } : p))
    )
    return result.data
  }

  const validerPaiement = (id) => changerStatut(id, 'valider')
  const refuserPaiement = (id) => changerStatut(id, 'refuser')

  useEffect(() => { getPaiements() }, [])

  return { paiements, isLoading, error, getPaiements, getPaiement, createPaiement, validerPaiement, refuserPaiement }
}
