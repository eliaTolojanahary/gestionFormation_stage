import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

// Hook des formations : liste (chargée au montage ; un formateur ne reçoit que les siennes),
// détail, CRUD. Les étudiants inscrits se lisent page par page (useListePaginee).
// etat : 'actif' (défaut), 'inactif' ou 'tous' ; charger: false : pas de liste au montage
// (la page Formations pagine elle-même par le serveur)
export function useFormation({ etat = 'actif', charger = true } = {}) {
  const [formations, setFormations] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')


  async function getFormations() {
    setIsLoading(true)
    setError('')
    try {
      const data = await apiRequest(etat === 'actif' ? '/formations' : `/formations?etat=${etat}`)
      setFormations(data.data || [])
      return data.data || []
    } catch (err) {
      setError(err.message || 'Impossible de charger les formations.')
      return []
    } finally {
      setIsLoading(false)
    }
  }

  async function getFormation(id) {
    const data = await apiRequest(`/formations/${id}`)
    return data.data
  }


  function createFormation(form) {
    return apiRequest('/formations', {
      method: 'POST',
      body: JSON.stringify(form),
    })
  }

  
  function updateFormation(id, form) {
    return apiRequest(`/formations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(form),
    })
  }

  
  // Couverture de la formation (vitrine mobile) : multipart, champ "image"
  function updateFormationImage(id, fichier) {
    const formData = new FormData()
    formData.append('image', fichier)
    return apiRequest(`/formations/${id}/image`, { method: 'PUT', body: formData })
  }

  async function deleteFormation(id) {
    const result = await apiRequest(`/formations/${id}`, { method: 'DELETE' })
    setFormations((current) => current.filter((formation) => formation.id_formation !== Number(id)))
    return result
  }

  function reactiverFormation(id) {
    return apiRequest(`/formations/${id}/reactiver`, { method: 'PUT' })
  }

  useEffect(() => {
    if (charger) getFormations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat, charger])

  return {
    formations,
    isLoading,
    error,
    getFormations,
    getFormation,
    createFormation,
    updateFormation,
    updateFormationImage,
    deleteFormation,
    reactiverFormation,
  }
}