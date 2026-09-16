import Icon from '../icon/Icon'
import './Header.css'
import { useProfile } from '../profile/ProfileContext'

function Header({ user, activeItem = 'Tableau de bord', onProfile }) {
  const profile = useProfile()
  const openProfile = onProfile || profile?.onProfile
  const displayUser = user || { prenom: 'Admin' }
  const isDashboard = activeItem === 'Tableau de bord'

  return (
    <header className="topbar">
      {isDashboard ? (
        <span>
          Centre / <strong>Tableau de bord</strong>
        </span>
      ) : (
        <span>
          IMTECH INFO / <strong>{activeItem}</strong>
        </span>
      )}

      <div className="top-actions">
        <button
        className="profile-box"
        onClick={openProfile}
        title="Ouvrir mon profil"
        >
          <span className="top-avatar">{displayUser.prenom?.[0] || 'A'}</span>
          <span>{displayUser.prenom || 'Admin'}</span>
        </button>
      </div>
    </header>
  )
}

export default Header
