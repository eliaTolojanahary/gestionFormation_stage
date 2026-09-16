import { useState, useEffect } from 'react'
import { apiRequest } from '../utils/api'

const INITIAL_KPIS = {
  nombre_formations: 0,
  formations_actives: 0,
  paiements_en_retard: 0,
  reste_a_encaisser: 0,
  montant_encaisse: 0,
}

const INITIAL_EVOLUTION = {
  periode: '',
  points: [],
  total: 0,
}

const INITIAL_PAYMENT_TABLE = []
const INITIAL_INSCRIPTIONS = []
const INITIAL_TOP_INSCRIPTIONS = []

export function useDashboard() {
  const [kpis, setKpis] = useState(INITIAL_KPIS)
  const [evolution, setEvolution] = useState(INITIAL_EVOLUTION)
  const [inscriptionsParMois, setInscriptionsParMois] = useState(INITIAL_INSCRIPTIONS)
  const [topInscriptions, setTopInscriptions] = useState(INITIAL_TOP_INSCRIPTIONS)
  const [paymentTable, setPaymentTable] = useState(INITIAL_PAYMENT_TABLE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function getKpiList() {
    setError('')
    setIsLoading(true)
    try {
      const data = await apiRequest('/dashboard/kpi')

      setKpis({
        nombre_formations: data.data.nombre_formations,
        formations_actives: data.data.formations_actives,
        paiements_en_retard: data.data.paiements_en_retard,
        reste_a_encaisser: data.data.reste_a_encaisser,
        montant_encaisse: data.data.montant_encaisse,
      })

      return data.data
    } catch (err) {
      setError(err.message || 'Impossible de contacter le serveur.')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  async function getEvolution(periode = 'hebdomadaire') {
    setError('')
    setIsLoading(true)
    try {
      const data = await apiRequest(`/dashboard/evolution?periode=${periode}`)
      const points = data.data || []

      setEvolution({
        periode: data.periode,
        points,
        total: points.reduce((sum, point) => sum + Number(point.total), 0),
      })

      return data.data
    } catch (err) {
      setError(err.message || 'Impossible de contacter le serveur.')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  async function getInscriptionsParMois() {
    setError('')
    try {
      const data = await apiRequest('/dashboard/inscriptionParMois')
      setInscriptionsParMois(data.data || [])
      return data.data
    } catch (err) {
      setError(err.message || 'Impossible de contacter le serveur.')
      return null
    }
  }

  async function getTopInscriptions() {
    setError('')
    try {
      const data = await apiRequest('/dashboard/topInscription')
      setTopInscriptions(data.data || [])
      return data.data
    } catch (err) {
      setError(err.message || 'Impossible de contacter le serveur.')
      return null
    }
  }

  async function getPaymentTable() {
    setError('')
    try {
      const data = await apiRequest('/echeances')
      setPaymentTable(data.data || [])
      return data.data
    } catch (err) {
      setError(err.message || 'Impossible de contacter le serveur.')
      return null
    }
  }

  useEffect(() => {
    getKpiList()
    getEvolution()
    getInscriptionsParMois()
    getTopInscriptions()
    getPaymentTable()
  }, [])

  return {
    kpis,
    evolution,
    inscriptionsParMois,
    paymentTable,
    topInscriptions,
    isLoading,
    error,
    getKpiList,
    getEvolution,
    getInscriptionsParMois,
    getTopInscriptions,
    getPaymentTable,
  }
}

