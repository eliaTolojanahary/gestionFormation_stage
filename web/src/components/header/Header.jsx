
import './Header.css'
import { useProfile } from '../profile/ProfileContext'
import Avatar from '../avatar/Avatar'
import Icon from '../icon/Icon'

// Barre du haut : fil d'Ariane (page courante), recherche globale (Ctrl+K) et bouton du profil.
// onProfile / onRecherche viennent des props ou, à défaut, du ProfileContext.
function Header({ user, activeItem = 'Tableau de bord', onProfile }) {
  const profile = useProfile()
  const openProfile = onProfile || profile?.onProfile
  const openRecherche = profile?.onRecherche
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
        {openRecherche && (
          <button type="button" className="topbar-recherche" onClick={openRecherche} title="Rechercher (Ctrl+K)">
            <Icon name="search" />
            <span>Rechercher…</span>
            <kbd>Ctrl K</kbd>
          </button>
        )}
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