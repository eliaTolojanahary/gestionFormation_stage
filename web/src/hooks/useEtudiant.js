import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

// Hook des étudiants : détail, formations suivies, CRUD.
// chargerListe : charge aussi la liste complète au montage (menu de choix du formulaire
// d'inscription) ; la page Étudiants, elle, est paginée côté serveur (useListePaginee).
export function useEtudiant({ chargerListe = false } = {}) {
  const [etudiants, setEtudiants] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')


  async function getEtudiants() {
    setIsLoading(true)
    setError('')

    try {
      const data = await apiRequest('/etudiants')
      setEtudiants(data.data || [])
      return data.data || []
    } catch (err) {
      setError(err.message || 'Impossible de charger les étudiants.')
      return []
    } finally {
      setIsLoading(false)
    }
  }


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
  async function deleteEtudiant(id) {
    const result = await apiRequest(`/etudiants/${id}`, { method: 'DELETE' })
    setEtudiants((current) => current.filter((e) => e.id_etudiant !== Number(id)))
    return result
  }

  useEffect(() => {
    if (chargerListe) getEtudiants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargerListe])

  return {
    etudiants,
    isLoading,
    error,
    getEtudiants,
    getEtudiant,
    getFormations,
    createEtudiant,
    updateEtudiant,
    deleteEtudiant
  }
}