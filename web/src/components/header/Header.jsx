
import './Header.css'
import { useProfile } from '../profile/ProfileContext'
import Avatar from '../avatar/Avatar'
import Icon from '../icon/Icon'
import { libelleBadge } from '../../utils/badge'

// Barre du haut : fil d'Ariane (page courante), recherche globale (Ctrl+K), cloche des
// notifications (badge « 9+ » au-delà de 9 non lues) et bouton du profil.
// onProfile / onRecherche / onNotifications viennent des props ou, à défaut, du ProfileContext.
function Header({ user, activeItem = 'Tableau de bord', onProfile }) {
  const profile = useProfile()
  const openProfile = onProfile || profile?.onProfile
  const openRecherche = profile?.onRecherche
  const openNotifications = profile?.onNotifications
  const nbNotifs = profile?.nbNotifs || 0
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
        {openNotifications && (
          <button
            type="button"
            className="topbar-cloche"
            onClick={openNotifications}
            title={nbNotifs ? `${nbNotifs} notification${nbNotifs > 1 ? 's' : ''} non lue${nbNotifs > 1 ? 's' : ''}` : 'Notifications'}
            aria-label={`Notifications${nbNotifs ? ` (${nbNotifs} non lues)` : ''}`}
          >
            <Icon name="bell" />
            {nbNotifs > 0 && <span className="cloche-badge">{libelleBadge(nbNotifs)}</span>}
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