// Formatage des dates en français.

// Date + heure, ex. "8 oct. 2026, 14:30"
export function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',       
  }).format(new Date(value))
}

// Date relative, ex. "il y a 5 minutes", "hier" ; au-delà d'une semaine, date simple
export function formatRelative(value) {
  if (!value) return '—'
  const d = new Date(value)
  const diff = (d.getTime() - Date.now()) / 1000  // secondes
  const rtf = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' })

  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(Math.round(diff), 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 604800) return rtf.format(Math.round(diff / 86400), 'day')
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(d)
}

// Date + heure dans le fuseau du navigateur, ex. "10/10/2026 14:30"
export function formatDateHeureLocale(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

// Valeur pour un <input type="datetime-local"> (heure locale), ex. "2026-10-10T14:30"
export function toDatetimeLocal(value) {
  const d = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
