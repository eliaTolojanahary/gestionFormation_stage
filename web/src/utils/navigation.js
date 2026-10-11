// Pages du tableau de bord et rôles qui y ont accès : une seule source pour le menu latéral
// (Sidebar) et pour les routes (DashboardLayout), qui redirige une URL tapée à la main.
// Note : cela ne fait que masquer / rediriger côté navigateur ; la vraie protection est faite par l'API.

const SA = 'Super Admin'
const AC = 'Accueil'
const FO = 'Formateur'

// [icône, libellé, chemin, rôles autorisés]
export const NAVIGATION = [
  ['book', 'Espace formateur', '/dashboard/formateur', [FO]],
  ['upload', 'Supports', '/dashboard/supports', [FO]],
  ['calendar', 'Supports programmés', '/dashboard/programmes', [FO]],
  ['chart', 'Tableau de bord', '/dashboard', [SA, AC]],
  ['users', 'Etudiants', '/dashboard/etudiants', [SA, AC, FO]],
  ['users', 'Utilisateurs', '/dashboard/utilisateurs', [SA]],
  ['book', 'Formations', '/dashboard/formations', [SA, AC, FO]],
  ['card', 'Inscriptions', '/dashboard/inscriptions', [SA, AC]],
  ['wallet', 'Paiements', '/dashboard/paiements', [SA, AC]],
  ['calendar', 'Échéances', '/dashboard/echeances', [SA, AC]],
  ['book', 'Documents', '/dashboard/documents', [SA, AC]],
  // Le formateur en reçoit aussi (ex. envoi automatique de ses supports programmés)
  ['bell', 'Notifications', '/dashboard/notifications', [SA, AC, FO]],
  // L'assistance traite les demandes des étudiants : réservée à l'Accueil et au Super Admin
  ['users', 'Assistance', '/dashboard/assistance', [SA, AC]],
  ['gear', 'Parametres', '/dashboard/parametres', [SA, AC, FO]],
]

// Entrées du menu visibles pour un rôle
export function menuDuRole(role) {
  return NAVIGATION.filter(([, , , roles]) => roles.includes(role))
}

// Le rôle peut-il ouvrir la page /dashboard/<segment> ? (ex. segment = 'paiements')
export function peutOuvrir(role, segment) {
  const page = NAVIGATION.find(([, , chemin]) => chemin === `/dashboard/${segment}`)
  return Boolean(page && page[3].includes(role))
}
