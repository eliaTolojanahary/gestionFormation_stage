// Lecture du user-agent d'une session (Paramètres > Sécurité)

// Nom du navigateur lisible ("Edg" testé avant "Chrome", car le user-agent d'Edge contient
// aussi "Chrome")
export function nomNavigateur(ua) {
  if (!ua) return 'Appareil inconnu'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  return ua.slice(0, 40)
}

// Système d'exploitation, ou '' s'il n'est pas reconnu
export function nomSysteme(ua) {
  if (!ua) return ''
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS')) return 'macOS'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Linux')) return 'Linux'
  return ''
}
