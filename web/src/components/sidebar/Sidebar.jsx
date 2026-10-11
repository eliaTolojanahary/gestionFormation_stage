import { useNavigate, useLocation } from 'react-router-dom'
import Icon from '../icon/Icon'
import './Sidebar.css'

// Menu latéral : [icône, libellé, chemin]. Les entrées affichées dépendent du rôle (voir Sidebar).
const navigationItems = [
  ['book', 'Espace formateur', '/dashboard/formateur'],
  ['chart', 'Tableau de bord', '/dashboard'],
  ['users', 'Etudiants', '/dashboard/etudiants'],
  ['users', 'Utilisateurs', '/dashboard/utilisateurs'],
  ['book', 'Formations', '/dashboard/formations'],
  ['card', 'Inscriptions', '/dashboard/inscriptions'],
  ['wallet', 'Paiements', '/dashboard/paiements'],
  ['calendar', 'Échéances', '/dashboard/echeances'],
  ['book', 'Documents', '/dashboard/documents'],
  ['bell', 'Notifications', '/dashboard/notifications'],
  ['users', 'Assistance', '/dashboard/assistance'],
  ['gear', 'Parametres', '/dashboard/parametres'],
  
]

// Barre latérale : logo, menu filtré selon le rôle, badge du nombre de notifications,
// profil et bouton de déconnexion.
// Note : ce filtrage ne fait que masquer des liens ; la vraie protection est faite par l'API.
function Sidebar({ user, onLogout, logo, nbNotifs = 0 }) {
  const navigate = useNavigate()
  const location = useLocation()

  let allowedItems = []
  const notifCount = Number.isFinite(Number(nbNotifs)) ? Number(nbNotifs) : 0

  if (user?.role === 'Super Admin') {
    allowedItems = navigationItems
  } else if (user?.role === 'Accueil') {
    allowedItems = navigationItems.filter(([, label]) =>
      ['Tableau de bord', 'Paiements', 'Échéances', 'Assistance', 'Notifications', 'Formations', 'Rapports', 'Documents', 'Inscriptions', 'Etudiants','Parametres'].includes(label)
    )
  } else if (user?.role === 'Formateur') {
    // L'assistance traite les demandes des étudiants : réservée à l'Accueil et au Super Admin
    allowedItems = navigationItems.filter(([, label]) => ['Espace formateur', 'Formations', 'Etudiants', 'Parametres'].includes(label))
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={logo} alt="IMTECH INFO" />
        <span>
          PLATEFORME<br />
          DE GESTION<br />
          DE FORMATION
        </span>
      </div>

      {user ? (
        <nav className="main-nav" aria-label="Navigation principale">
          {allowedItems.map(([icon, label, path]) => {
            // Lien actif si l'URL correspond (ou une sous-page, ex. /dashboard/etudiants/12)
            const isActive = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path))
            return (
              <button
                className={`nav-item ${isActive ? 'active' : ''}`}
                key={label}
                type="button"
                onClick={() => navigate(path)}
              >
                <Icon name={icon} />
                <span>{label}</span>
                {label === 'Notifications' && <b>{notifCount}</b>}
              </button>
            )
          })}
        </nav>
      ) : (
        <div className="main-nav">
          <p className="logout-message">Veuillez vous connecter</p>
        </div>
      )}

      {/* Bloc de bas de page : Profil + Bouton Déconnexion */}
      <div className="sidebar-footer">
        <div className="profile-box">
          <span className="avatar">
            {user?.prenom?.[0] || 'A'}
          </span>
          <div className="profile-info">
            <strong>
              {user?.prenom || 'Admin'} {user?.nom || ''}
            </strong>
            <small>{user?.role || 'Utilisateur'}</small>
          </div>
        </div>

        <button
          className="logout-button"
          type="button"
          onClick={onLogout}
          title="Se déconnecter"
        >
          <Icon name="logout" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar