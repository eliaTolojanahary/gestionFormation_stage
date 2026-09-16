import { useNavigate, useLocation } from 'react-router-dom'
import Icon from '../icon/Icon'
import './Sidebar.css'

const navigationItems = [
  ['grid', 'Tableau de bord', '/dashboard'],
  ['users', 'Etudiants', '/dashboard/etudiants'],
  ['users', 'Utilisateurs', '/dashboard/utilisateurs'],
  ['book', 'Formations', '/dashboard/formations'],
  ['card', 'Inscriptions', '/dashboard/inscriptions'],
  ['wallet', 'Paiements', '/dashboard/paiements'],
  ['calendar', 'Échéances', '/dashboard/echeances'],
  ['book', 'Documents', '/dashboard/documents'],
  ['chart', 'Rapports', '/dashboard/rapports'],
  ['bell', 'Notifications', '/dashboard/notifications'],
  ['users', 'Assistance', '/dashboard/assistance'],
  ['gear', 'Parametres', '/dashboard/parametres'],
  ['book', 'Espace formateur', '/dashboard/formateur'],
]

function Sidebar({ user, onLogout, logo, nbNotifs = 0 }) {
  const navigate = useNavigate()
  const location = useLocation()

  let allowedItems = []
  const notifCount = Number.isFinite(Number(nbNotifs)) ? Number(nbNotifs) : 0

  if (user?.role === 'Super Admin') {
    allowedItems = navigationItems
  } else if (user?.role === 'Accueil') {
    allowedItems = navigationItems.filter(([icon, label]) =>
      ['Tableau de bord', 'Paiements', 'Échéances', 'Assistance', 'Notifications', 'Formations', 'Rapports', 'Documents', 'Inscriptions', 'Etudiants'].includes(label)
    )
  } else if (user?.role === 'Formateur') {
    allowedItems = navigationItems.filter(([, label]) => ['Espace formateur', 'Assistance'].includes(label))
  } else {
    allowedItems = []
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
            const isActive = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path))
            return (
              <button
                className={`nav-item ${isActive ? 'active' : ''}`}
                key={label}
                type="button"
                onClick={() => navigate(path)}
              >
                <Icon name={icon} />
                {label}
                {label === 'Notifications' && <b>{notifCount}</b>}
              </button>
            )
          })}
        </nav>
      ) : (
        <p>Veuillez vous connecter</p>
      )}

      <button
        className="profile-box"
        type="button"
        onClick={onLogout}
        title="Ouvrir mon profil"
      >
        <span className="avatar">
          {user?.prenom?.[0] || 'A'}
        </span>
        <span>
          <strong>
            {user?.prenom || 'Admin'} {user?.nom || ''}
          </strong>
          <small>{user?.role || ''}</small>
        </span>
        <Icon name="logout" />
      </button>
    </aside>
  )
}

export default Sidebar