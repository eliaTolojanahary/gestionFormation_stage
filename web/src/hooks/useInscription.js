import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

// Hook des inscriptions : liste (chargée au montage), création, validation, suppression.
export function useInscription() {
  const [inscriptions, setInscriptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')


  async function getInscriptions() {
    setIsLoading(true)
    setError('')
    try {
      const data = await apiRequest('/inscriptions')
      setInscriptions(data.data || [])
      return data.data || []
    } catch (err) {
      setError(err.message || 'Impossible de charger les inscriptions.')
      return []
    } finally {
      setIsLoading(false)
    }
  }

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
  async function validateInscription(id, payment) {
    const result = await apiRequest(`/inscriptions/${id}/valid`, {
      method: 'POST',
      body: JSON.stringify(payment),
    })
    setInscriptions((current) =>
      current.map((item) =>
        item.id_inscription === Number(id) ? { ...item, valide: true } : item
      )
    )
    return result
  }

  async function deleteInscription(id) {
    const result = await apiRequest(`/inscriptions/${id}`, { method: 'DELETE' })
    setInscriptions((current) => current.filter((item) => item.id_inscription !== Number(id)))
    return result
  }

  useEffect(() => {
    getInscriptions()
  }, [])

  return {
    inscriptions,
    isLoading,
    error,
    getInscriptions,
    getInscription,
    createInscription,
    validateInscription,
    deleteInscription,
  }
}