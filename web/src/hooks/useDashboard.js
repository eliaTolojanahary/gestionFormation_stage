import { useState, useEffect } from 'react'
import { apiRequest, API_BASE_URL, buildHeaders, MESSAGE_HORS_LIGNE, messageErreurHttp } from '../utils/api'
import { PERIODE_TOUT, requetePeriode } from '../utils/periodes'

// Hook du tableau de bord : charge les indicateurs, l'évolution des encaissements,
// les inscriptions par mois, le top des formations et le tableau des échéances.

// Valeurs affichées avant la réponse de l'API
const INITIAL_KPIS = {
  nombre_formations: 0,
  formations_actives: 0,
  paiements_en_retard: 0,
  reste_a_encaisser: 0,
  montant_encaisse: 0,
  montant_a_venir: 0,
  montant_en_attente: 0,
  montant_en_retard: 0,
  nb_a_venir: 0,
  nb_en_attente: 0,
  nb_en_retard: 0,
}

const INITIAL_EVOLUTION = {
  periode: '',
  points: [],
  total: 0,
}

const INITIAL_PAYMENT_TABLE = { lignes: [], total: 0, alertes: 0 }
const INITIAL_INSCRIPTIONS = []
const INITIAL_TOP_INSCRIPTIONS = []
const LIGNES_A_SURVEILLER = 5 // lignes du tableau « Paiements à surveiller »

export function useDashboard() {
  const [kpis, setKpis] = useState(INITIAL_KPIS)
  const [evolution, setEvolution] = useState(INITIAL_EVOLUTION)
  const [inscriptionsParMois, setInscriptionsParMois] = useState(INITIAL_INSCRIPTIONS)
  const [topInscriptions, setTopInscriptions] = useState(INITIAL_TOP_INSCRIPTIONS)
  const [paymentTable, setPaymentTable] = useState(INITIAL_PAYMENT_TABLE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Indicateurs clés (montant encaissé, reste à encaisser, retards...) sur la période choisie
  async function getKpiList(periode = PERIODE_TOUT) {
    setError('')
    setIsLoading(true)
    try {
      const data = await apiRequest(`/dashboard/kpi${requetePeriode(periode)}`)

      setKpis({ ...INITIAL_KPIS, ...data.data })

      return data.data
    } catch (err) {
      setError(err.message || 'Impossible de contacter le serveur.')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Encaissements sur la période choisie + total cumulé pour l'affichage
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

  // Inscriptions par mois, en ne comptant que celles faites pendant la période choisie
  async function getInscriptionsParMois(periode = PERIODE_TOUT) {
    setError('')
    try {
      const data = await apiRequest(`/dashboard/inscriptionParMois${requetePeriode(periode)}`)
      setInscriptionsParMois(data.data || [])
      return data.data
    } catch (err) {
      setError(err.message || 'Impossible de contacter le serveur.')
      return null
    }
  }

  // 5 formations les plus suivies sur la période choisie
  async function getTopInscriptions(periode = PERIODE_TOUT) {
    setError('')
    try {
      const data = await apiRequest(`/dashboard/topInscription${requetePeriode(periode)}`)
      setTopInscriptions(data.data || [])
      return data.data
    } catch (err) {
      setError(err.message || 'Impossible de contacter le serveur.')
      return null
    }
  }

  // Tableau de suivi des paiements : les 5 échéances les plus urgentes de la période (retards, puis
  // J-2 à J, puis les autres, par date dans chaque couleur) et les totaux. Une page de 5 par couleur,
  // demandée au serveur : on ne charge jamais toutes les échéances de la période.
  async function getPaymentTable(periode = PERIODE_TOUT) {
    setError('')
    try {
      const pages = await Promise.all(['ROUGE', 'JAUNE', 'VERT'].map((statut) => {
        const params = new URLSearchParams({ statut, page: '1', limite: String(LIGNES_A_SURVEILLER) })
        if (periode.debut) params.set('debut', periode.debut)
        if (periode.fin) params.set('fin', periode.fin)
        return apiRequest(`/echeances?${params}`)
      }))
      const [rouge, jaune, vert] = pages.map((page) => ({ lignes: page.data || [], total: page.pagination?.total || 0 }))
      const tableau = {
        lignes: [...rouge.lignes, ...jaune.lignes, ...vert.lignes].slice(0, LIGNES_A_SURVEILLER),
        total: rouge.total + jaune.total + vert.total,
        alertes: rouge.total + jaune.total,
      }
      setPaymentTable(tableau)
      return tableau
    } catch (err) {
      setError(err.message || 'Impossible de contacter le serveur.')
      return null
    }
  }

  // Export des inscriptions en CSV : apiRequest attend du JSON, on lit donc la réponse
  // en fichier (blob) puis on déclenche le téléchargement avec un lien temporaire.
  // Renvoie le nombre de lignes si le serveur a coupé l'export (en-tête X-Export-Limite), sinon null.
  async function exporterCSV() {
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/export-csv`, { headers: buildHeaders() })
        .catch(() => { throw new Error(MESSAGE_HORS_LIGNE) })
      if (!response.ok) throw new Error(messageErreurHttp(response.status))

      const url = URL.createObjectURL(await response.blob())
      const lien = document.createElement('a')
      lien.href = url
      lien.download = `inscriptions_${new Date().toISOString().slice(0, 10)}.csv`
      lien.click()
      URL.revokeObjectURL(url)
      return Number(response.headers.get('X-Export-Limite')) || null
    } catch (err) {
      setError(err.message || "Impossible d'exporter les inscriptions.")
      return null
    }
  }

  // Recharge les états qui dépendent du filtre « Du … au … »
  function chargerPeriode(periode) {
    getKpiList(periode)
    getInscriptionsParMois(periode)
    getTopInscriptions(periode)
    getPaymentTable(periode)
  }

  // Chargement de toutes les données à l'ouverture du tableau de bord
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
    chargerPeriode,
    exporterCSV,
  }
}

