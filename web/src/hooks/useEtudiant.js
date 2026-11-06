import { apiRequest } from '../utils/api'

// Hook des étudiants : détail, formations suivies, CRUD.
// Pas de liste ici : la page Étudiants est paginée côté serveur (useListePaginee) et le
// formulaire d'inscription cherche l'étudiant au serveur (ChampRecherche).
export function useEtudiant() {
  async function getEtudiant(id) {
    const data = await apiRequest(`/etudiants/${id}`)
    return data.data
  }


  async function getFormations(id) {
    const data = await apiRequest(`/etudiants/${id}/formations`)
    return data.data || []
  }

// formData = FormData avec les infos et les pièces justificatives (photos, CIN, certificat)
function createEtudiant(formData) {
  return apiRequest('/etudiants', {
    method: 'POST',
    body: formData,
  })
}

function updateEtudiant(id, formData) {
  return apiRequest(`/etudiants/${id}`, {
    method: 'PUT',
    body: formData,
  })
}
  function deleteEtudiant(id) {
    return apiRequest(`/etudiants/${id}`, { method: 'DELETE' })
  }

  // Étudiant désactivé (filtre « Désactivés ») remis dans la liste
  function reactiverEtudiant(id) {
    return apiRequest(`/etudiants/${id}/reactiver`, { method: 'PUT' })
  }

  return {
    getEtudiant,
    getFormations,
    createEtudiant,
    updateEtudiant,
    deleteEtudiant,
    reactiverEtudiant,
  }
}
