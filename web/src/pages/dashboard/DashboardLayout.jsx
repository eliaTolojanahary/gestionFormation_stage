import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import logoImtech from '../../assets/logoImtech.png'
import Sidebar from '../../components/sidebar/Sidebar'
import ProfileModal from '../../components/profile/ProfileModal'
import { ProfileProvider } from '../../components/profile/ProfileContext'
import DashboardContent from '../../components/dashboard/DashboardContent'
import RechercheGlobale from '../../components/recherche/RechercheGlobale'
import { EtudiantsRoutes, UtilisateursRoutes, FormationsRoutes, InscriptionsRoutes } from './SectionsRoutes'
import Paiements from '../paiements/Paiements'
import Echeances from '../echeances/Echeances'
import Documents from '../documents/Documents'
import Assistance from '../assistance/Assistance'
import Notifications from '../notifications/Notifications'
import Parametres from '../parametres/Parametres'
import AccueilFormateur from '../formateur/AccueilFormateur'
import SupportsFormateur from '../formateur/SupportsFormateur'
import ProgrammesFormateur from '../formateur/ProgrammesFormateur'
import { useNotification } from '../../hooks/useNotification'
import { usePreferences } from '../../hooks/usePreferences'
import { apiRequest } from '../../utils/api'
import { cheminResultat, peutOuvrir } from '../../utils/navigation'
import '../WorkspacePages.css'

// Cadre commun de l'espace connecté : barre latérale + page courante (sous-routes /dashboard/...).
// Gère aussi la fenêtre de profil, la recherche globale, les préférences d'affichage
// (usePreferences) et le compteur de notifications. Les fiches ont leur propre URL (SectionsRoutes).
function DashboardLayout({ user, onLogout, updateCurrentUser }) {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(user)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  // Recherche globale : bouton du header ou Ctrl+K (⌘K sur Mac)
  const [isRechercheOpen, setIsRechercheOpen] = useState(false)
  const [settings, setSettings] = usePreferences()

  // Notifications non lues -> badge de la cloche (header).
  // `lu` vient de MySQL (0 / 1) : on teste donc !lu, pas lu === false.
  const location = useLocation()
  const { notifications, getNotifications } = useNotification()
  const nbNonLues = notifications.filter((notification) => !notification.lu).length
  const peutVoirNotifs = peutOuvrir(currentUser.role, 'notifications')

  // Compteur rafraîchi à chaque changement de page et toutes les minutes
  useEffect(() => {
    if (peutVoirNotifs) getNotifications()
  }, [location.pathname])

  // Session révoquée depuis un autre appareil (« Se déconnecter partout ») : sans requête,
  // ce navigateur ne le saurait qu'au prochain clic. On vérifie donc la session quand l'onglet
  // revient au premier plan et toutes les minutes ; un 401 renvoie à la connexion (utils/api.js).
  // Le compteur de notifications est rafraîchi au même rythme.
  useEffect(() => {
    function verifierSession() {
      if (document.visibilityState !== 'visible') return
      apiRequest('/auth/profil').catch(() => {})
      if (peutVoirNotifs) getNotifications()
    }
    document.addEventListener('visibilitychange', verifierSession)
    const intervalle = window.setInterval(verifierSession, 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', verifierSession)
      window.clearInterval(intervalle)
    }
  }, [])

  useEffect(() => {
    function raccourci(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setIsRechercheOpen(true)
      }
    }
    window.addEventListener('keydown', raccourci)
    return () => window.removeEventListener('keydown', raccourci)
  }, [])

  // Ouvre un résultat de la recherche globale (adresse calculée par utils/navigation.js)
  function ouvrirResultat(resultat) {
    setIsRechercheOpen(false)
    const destination = cheminResultat(resultat, currentUser.role)
    if (destination) navigate(destination.chemin, { state: destination.state })
  }

  // Page /dashboard/<segment> : affichée seulement si le rôle y a droit (même règle que le menu,
  // utils/navigation.js) ; sinon, une URL tapée à la main ramène à l'accueil du tableau de bord
  function pageAutorisee(segment, page) {
    return peutOuvrir(currentUser.role, segment) ? page : <Navigate to="/dashboard" replace />
  }

  return (
    <ProfileProvider
      value={{
        onProfile: () => setIsProfileOpen(true),
        onRecherche: () => setIsRechercheOpen(true),
        updateCurrentUser,
        nbNotifs: nbNonLues,
        onNotifications: peutVoirNotifs ? () => navigate('/dashboard/notifications') : null,
        rafraichirNotifs: getNotifications,
      }}
    >
      <main className="dashboard-page">
        <Sidebar
          user={currentUser}
          onLogout={onLogout}
          logo={settings.logo || logoImtech}
        />

        <Routes>
          {/* Accueil : espace formateur pour un formateur, tableau de bord pour les autres */}
          <Route
            path="/"
            element={currentUser.role === 'Formateur'
              ? <AccueilFormateur user={currentUser} />
              : <DashboardContent user={currentUser} />}
          />
          {/* Sections avec fiches : /etudiants/12, /formations/3/modifier... (SectionsRoutes.jsx) */}
          <Route path="etudiants/*" element={pageAutorisee('etudiants', <EtudiantsRoutes user={currentUser} />)} />
          <Route path="utilisateurs/*" element={pageAutorisee('utilisateurs', <UtilisateursRoutes user={currentUser} />)} />
          <Route path="formations/*" element={pageAutorisee('formations', <FormationsRoutes user={currentUser} />)} />
          <Route path="inscriptions/*" element={pageAutorisee('inscriptions', <InscriptionsRoutes user={currentUser} />)} />
          <Route path="paiements" element={pageAutorisee('paiements', <Paiements user={currentUser} />)} />
          <Route path="echeances" element={pageAutorisee('echeances', <Echeances user={currentUser} />)} />
          <Route path="documents" element={pageAutorisee('documents', <Documents user={currentUser} />)} />
          <Route path="assistance" element={pageAutorisee('assistance', <Assistance user={currentUser} />)} />
          <Route path="formateur" element={pageAutorisee('formateur', <AccueilFormateur user={currentUser} />)} />
          <Route path="supports" element={pageAutorisee('supports', <SupportsFormateur user={currentUser} />)} />
          <Route path="programmes" element={pageAutorisee('programmes', <ProgrammesFormateur user={currentUser} />)} />
          <Route path="notifications" element={pageAutorisee('notifications', <Notifications user={currentUser} />)} />
          <Route
            path="parametres"
            element={pageAutorisee('parametres', <Parametres user={currentUser} settings={settings} onSettingsChange={setSettings} />)}
          />
          {/* Adresse inconnue : retour à l'accueil du tableau de bord */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {isRechercheOpen && (
          <RechercheGlobale
            user={currentUser}
            onClose={() => setIsRechercheOpen(false)}
            onOuvrir={ouvrirResultat}
          />
        )}

        {isProfileOpen && (
          <ProfileModal
            user={currentUser}
            onClose={() => setIsProfileOpen(false)}
            onUpdated={(updatedUser) => { setCurrentUser(updatedUser); setIsProfileOpen(false) }}
          />
        )}
      </main>
    </ProfileProvider>
  )
}

export default DashboardLayout
