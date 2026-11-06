// Fonctions d'affichage du tableau de bord (graphiques et statuts de paiement).

// Libellé de l'axe du graphique selon la période, à partir de la clé renvoyée par l'API
// ('AAAA', 'AAAA-MM' ou 'AAAA-MM-JJ') : année, mois ("oct. 26"), ou "jj/mm" (jour, ou lundi de la semaine).
// La clé est découpée à la main : new Date('AAAA-MM-JJ') la lirait en UTC et pourrait décaler d'un jour.
export function formatLabel(cle, periode) {
  const [annee, mois = 1, jour = 1] = String(cle).split('-').map(Number)
  const date = new Date(annee, mois - 1, jour)

  if (periode === 'annuel') {
    return String(annee)
  }

  if (periode === 'mensuel') {
    return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  })
}

// Libellé sur deux lignes sous une barre : jour / semaine → « 26 » puis « sept. » ;
// mois → « sept. » puis « 2026 » ; année → « 2026 » seule
export function labelDeuxLignes(cle, periode) {
  const [annee, mois = 1, jour = 1] = String(cle).split('-').map(Number)
  const date = new Date(annee, mois - 1, jour)
  const nomMois = date.toLocaleDateString('fr-FR', { month: 'short' })

  if (periode === 'annuel') return { haut: String(annee), bas: '' }
  if (periode === 'mensuel') return { haut: nomMois, bas: String(annee) }
  return { haut: String(jour), bas: nomMois }
}

// Sous-titre du graphique des encaissements
export const DESCRIPTION_PERIODE = {
  quotidien: 'par jour, 7 derniers jours',
  hebdomadaire: 'par semaine, 8 dernières semaines',
  mensuel: 'par mois, 12 derniers mois',
  annuel: 'par année',
}

// Convertit les totaux en coordonnées {x, y} dans un SVG de 400×150 :
// x réparti régulièrement, y proportionnel au total (le plus grand total touche le haut).
// En SVG l'axe y descend, d'où le "chartHeight - ...".
// Montant court au-dessus d'une barre : « 750 k », « 1,58 M »
export function montantCourt(valeur) {
  const n = Number(valeur) || 0
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M`
  if (n >= 1e3) return `${Math.round(n / 1e3)} k`
  return String(Math.round(n))
}

// Évolution par rapport à la période précédente : « +42 % », « −8 % » (null pour la première)
export function variation(total, precedent) {
  if (!precedent || Number(precedent) === 0) return null
  const taux = Math.round(((Number(total) - Number(precedent)) / Number(precedent)) * 100)
  return `${taux >= 0 ? '+' : '−'}${Math.abs(taux)} %`
}

export function buildLineChartPoints(points) {
  const chartWidth = 400
  const chartHeight = 150
  const bottomPadding = 8
  const topPadding = 6
  const maxTotal = Math.max(...points.map((point) => Number(point.total)), 1)
  const lastIndex = Math.max(points.length - 1, 1)

  return points.map((point, index) => {
    const x = (index / lastIndex) * chartWidth
    const y =
      chartHeight -
      bottomPadding -
      (Number(point.total) / maxTotal) * (chartHeight - topPadding - bottomPadding)

    return { x, y }
  })
}

// Ex. "08/10/2026"
export function formatPaymentDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Libellé et classe CSS du statut de couleur calculé par l'API (ROUGE / JAUNE / VERT)
export function getPaymentStatus(status) {
  const statuses = {
    ROUGE: { label: 'En retard', className: 'late' },
    JAUNE: { label: 'À rappeler', className: 'soon' },
    VERT: { label: 'À jour', className: 'ok' },
  }

  return statuses[status] || { label: status, className: 'soon' }
}

