import { apiRequest } from '../utils/api'

// Hook des inscriptions : détail, création, validation, suppression.
// La liste est paginée côté serveur : useListePaginee('/inscriptions', filtres) dans la page.
export function useInscription() {
  async function getInscription(id) {
    const data = await apiRequest(`/inscriptions/${id}`)
    return data.data
  }

  // Le serveur génère automatiquement l'échéancier
  function createInscription(form) {
    return apiRequest('/inscriptions', {
      method: 'POST',
      body: JSON.stringify(form),
    })
  }

  // Valide l'inscription en enregistrant le premier paiement (payment = mode + référence)
  function validateInscription(id, payment) {
    return apiRequest(`/inscriptions/${id}/valid`, {
      method: 'POST',
      body: JSON.stringify(payment),
    })
  }

  function deleteInscription(id) {
    return apiRequest(`/inscriptions/${id}`, { method: 'DELETE' })
  }

  return { getInscription, createInscription, validateInscription, deleteInscription }
}
