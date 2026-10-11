import { apiRequest } from '../utils/api'

// Hook des échéances : échéancier d'une inscription, modification et rappels.
// La liste est paginée côté serveur : useListePaginee('/echeances', filtres) dans la page.
export function useEcheance() {
  async function getEcheancesByInscription(id) {
    const result = await apiRequest(`/inscriptions/${id}/echeances`)
    return result.data || []
  }

  function updateEcheance(id, payload) {
    return apiRequest(`/echeances/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
  }

  // Bouton « Rappeler » : le serveur envoie une notification in-app + un e-mail à l'étudiant
  function rappelerEcheance(id) {
    return apiRequest(`/echeances/${id}/rappeler`, { method: 'POST' })
  }

  return { getEcheancesByInscription, updateEcheance, rappelerEcheance }
}
