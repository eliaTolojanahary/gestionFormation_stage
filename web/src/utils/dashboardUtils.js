// Fonctions d'affichage du tableau de bord (graphiques et statuts de paiement).

// Libellé de l'axe du graphique selon la période : mois ("oct."), année, ou "jj/mm"
export function formatLabel(isoDate, periode) {
  const date = new Date(isoDate)

  if (periode === 'mensuel') {
    return date.toLocaleDateString('fr-FR', { month: 'short' })
  }

  if (periode === 'annuel') {
    return date.getFullYear()
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  })
}

// Convertit les totaux en coordonnées {x, y} dans un SVG de 400×150 :
// x réparti régulièrement, y proportionnel au total (le plus grand total touche le haut).
// En SVG l'axe y descend, d'où le "chartHeight - ...".
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

