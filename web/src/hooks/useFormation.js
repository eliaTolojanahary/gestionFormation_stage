import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

// Hook des formations : liste (chargée au montage ; un formateur ne reçoit que les siennes),
// détail, étudiants inscrits, CRUD.
export function useFormation() {
  const [formations, setFormations] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')


  async function getFormations() {
    setIsLoading(true)
    setError('')
    try {
      const data = await apiRequest('/formations')
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

  async function getEtudiants(id) {
    const data = await apiRequest(`/formations/${id}/etudiants`)
    return data.data || []
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

  useEffect(() => {
    getFormations()
  }, [])

  return {
    formations,
    isLoading,
    error,
    getFormations,
    getFormation,
    getEtudiants,
    createFormation,
    updateFormation,
    updateFormationImage,
    deleteFormation,
  }
}