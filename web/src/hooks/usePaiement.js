import { apiRequest } from '../utils/api'

// Libellés affichés pour les statuts de paiement renvoyés par l'API
export const STATUTS_PAIEMENT = {
  en_attente: 'En attente',
  valide: 'Validé',
  refuse: 'Refusé',
}

// Hook des paiements : saisie par le personnel, validation / refus, détail.
// La liste est paginée côté serveur : useListePaginee('/paiements', filtres) dans la page.
export function usePaiement() {
  async function getPaiement(id) {
    const result = await apiRequest(`/paiements/${id}`)
    return result.data
  }

  // Paiement saisi par le personnel (validé directement)
  function createPaiement(payload) {
    return apiRequest('/paiements', { method: 'POST', body: JSON.stringify(payload) })
  }

  // Validation / refus d'un paiement envoyé par un étudiant depuis l'app mobile ; renvoie le paiement
  async function changerStatut(id, action) {
    const result = await apiRequest(`/paiements/${id}/${action}`, { method: 'PUT' })
    return result.data
  }

  const validerPaiement = (id) => changerStatut(id, 'valider')
  const refuserPaiement = (id) => changerStatut(id, 'refuser')

  return { getPaiement, createPaiement, validerPaiement, refuserPaiement }
}
