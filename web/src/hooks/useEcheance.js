import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

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

  useEffect(() => { getEcheances() }, [])

  return { echeances, isLoading, error, getEcheances, getEcheancesByInscription, updateEcheance }
}
