
import './Header.css'
import { useProfile } from '../profile/ProfileContext'
import Avatar from '../avatar/Avatar'

// Barre du haut : fil d'Ariane (page courante) et bouton du profil.
// onProfile vient des props ou, à défaut, du ProfileContext.
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
          type="button"
          className="profile-box"
          onClick={openProfile}
          title="Ouvrir mon profil"
        >
         
          <Avatar photo={displayUser.photo} prenom={displayUser.prenom} nom={displayUser.nom} shape="circle" size="lg" fallback="U" />
          <strong>{displayUser.prenom || displayUser.nom || 'Admin'}</strong>
        </button>
      </div>
    </header>
  )
}

export default Header