
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

export function formatPaymentDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function getPaymentStatus(status) {
  const statuses = {
    ROUGE: { label: 'En retard', className: 'late' },
    ORANGE: { label: "Aujourd'hui", className: 'soon' },
    VERT: { label: 'A jour', className: 'ok' },
  }

  return statuses[status] || { label: status, className: 'soon' }
}

