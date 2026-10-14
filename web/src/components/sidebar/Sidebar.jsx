import { useNavigate, useLocation } from 'react-router-dom'
import Icon from '../icon/Icon'
import { menuLateral } from '../../utils/navigation'
import './Sidebar.css'

// Barre latérale : logo, menu filtré selon le rôle (Notifications s'ouvre par la cloche du header),
// profil et bouton de déconnexion.
// Note : ce filtrage ne fait que masquer des liens ; la vraie protection est faite par l'API.
function Sidebar({ user, onLogout, logo }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Entrées autorisées pour le rôle (utils/navigation.js, partagé avec les routes)
  const allowedItems = user ? menuLateral(user.role) : []

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