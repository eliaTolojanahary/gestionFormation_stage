import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

// Avis des étudiants sur les formateurs, calculé par l'API à partir des réactions sur leurs supports
export function useAvisFormateurs() {
  const [formateurs, setFormateurs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    apiRequest('/formateurs/avis')
      .then((result) => { if (!cancelled) setFormateurs(result.data || []) })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || "Impossible de charger l'avis sur les formateurs.")
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { formateurs, isLoading, error }
}
