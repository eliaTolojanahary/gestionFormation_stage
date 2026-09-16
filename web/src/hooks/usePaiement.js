import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

export function usePaiement() {
  const [paiements, setPaiements] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function getPaiements() {
    setIsLoading(true)
    setError('')
    try {
      const result = await apiRequest('/paiements')
      const data = result.data || []
      setPaiements(data)
      return data
    } catch (requestError) {
      setError(requestError.message || 'Impossible de charger les paiements.')
      return []
    } finally {
      setIsLoading(false)
    }
  }

  async function getPaiement(id) {
    const result = await apiRequest(`/paiements/${id}`)
    return result.data
  }

  async function createPaiement(payload) {
    const result = await apiRequest('/paiements', { method: 'POST', body: JSON.stringify(payload) })
    await getPaiements()
    return result
  }

  useEffect(() => { getPaiements() }, [])

  return { paiements, isLoading, error, getPaiements, getPaiement, createPaiement }
}
