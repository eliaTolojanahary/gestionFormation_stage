import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

// Hook des échéances : liste complète (chargée au montage), échéancier d'une inscription,
// modification et rappels.
export function useEcheance() {
  const [echeances, setEcheances] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function getEcheances() {
    setIsLoading(true)
    setError('')
    try {
      const result = await apiRequest('/echeances')
      const data = result.data || []
      setEcheances(data)
      return data
    } catch (requestError) {
      setError(requestError.message || 'Impossible de charger les échéances.')
      return []
    } finally {
      setIsLoading(false)
    }
  }

  async function getEcheancesByInscription(id) {
    const result = await apiRequest(`/inscriptions/${id}/echeances`)
    return result.data || []
  }

  async function updateEcheance(id, payload) {
    const result = await apiRequest(`/echeances/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
    await getEcheances()
    return result
  }

  // Bouton « Rappeler » : le serveur envoie une notification in-app + un e-mail à l'étudiant
  async function rappelerEcheance(id) {
    const result = await apiRequest(`/echeances/${id}/rappeler`, { method: 'POST' })
    // Mise à jour locale de la date du dernier rappel, sans recharger toute la liste
    const maintenant = new Date().toISOString()
    setEcheances((liste) =>
      liste.map((e) => (e.id_echeance === id ? { ...e, date_dernier_rappel: maintenant } : e))
    )
    return result
  }

  useEffect(() => { getEcheances() }, [])

  return { echeances, isLoading, error, getEcheances, getEcheancesByInscription, updateEcheance, rappelerEcheance }
}
