import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'
import { PERIODE_TOUT, requetePeriode } from '../utils/periodes'

// Avis des étudiants sur les formateurs, calculé par l'API à partir des réactions sur leurs supports,
// en ne comptant que les réactions données pendant la période { debut, fin } (voir utils/periodes)
export function useAvisFormateurs(periode = PERIODE_TOUT, version = 0) {
  const { debut, fin } = periode
  const [formateurs, setFormateurs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    apiRequest(`/formateurs/avis${requetePeriode({ debut, fin })}`)
      .then((result) => {
        if (cancelled) return
        setError('')
        setFormateurs(result.data || [])
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message || "Impossible de charger l'avis sur les formateurs.")
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [debut, fin, version])

  return { formateurs, isLoading, error }
}
