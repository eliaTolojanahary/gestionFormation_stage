import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import logoImtech from '../../assets/logoImtech.png'
import Sidebar from '../../components/sidebar/Sidebar'
import ProfileModal from '../../components/profile/ProfileModal'
import { ProfileProvider } from '../../components/profile/ProfileContext'
import DashboardContent from '../../components/dashboard/DashboardContent'
import Etudiants from '../etudiants/Etudiants'
import EtudiantDetail from '../etudiants/EtudiantDetail'
import EtudiantForm from '../etudiants/EtudiantForm'
import Users from '../users/Users'
import UserForm from '../users/UserForm'
import Formations from '../formations/Formations'
import FormationDetail from '../formations/FormationDetail'
import FormationForm from '../formations/FormationForm'
import Inscriptions from '../inscriptions/Inscriptions'
import InscriptionDetail from '../inscriptions/InscriptionDetail'
import InscriptionForm from '../inscriptions/InscriptionForm'
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
import { apiRequest } from '../../utils/api'
import '../WorkspacePages.css'

// Vue affichée dans une section : 'list', 'detail', 'create' ou 'edit' (+ id de l'élément)
const INITIAL_VIEW = { type: 'list', id: null }

// Cadre commun de l'espace connecté : barre latérale + page courante (sous-routes /dashboard/...).
// Gère aussi la fenêtre de profil, les préférences d'affichage et le compteur de notifications.
function DashboardLayout(props) {
  const user = props.user
  const onLogout = props.onLogout
  const updateCurrentUser = props.updateCurrentUser


  // Session révoquée depuis un autre appareil (« Se déconnecter partout ») : sans requête,
  // ce navigateur ne le saurait qu'au prochain clic. On vérifie donc la session quand l'onglet
  // revient au premier plan et toutes les minutes ; un 401 renvoie à la connexion (utils/api.js).
  useEffect(() => {
    function verifierSession() {
      if (document.visibilityState === 'visible') apiRequest('/auth/profil').catch(() => {})
    }
    document.addEventListener('visibilitychange', verifierSession)
    const intervalle = window.setInterval(verifierSession, 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', verifierSession)
      window.clearInterval(intervalle)
    }
  }, [])

  const notificationData = useNotification()
  const notifications = notificationData.notifications

  // Notifications non lues -> badge dans la barre latérale
  const unreadNotifications = []
  for (let i = 0; i < notifications.length; i++) {
    if (notifications[i].lu === false) {
      unreadNotifications.push(notifications[i])
    }
  }

  const [currentUser, setCurrentUser] = useState(user)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  // Vue courante de chaque section (liste / détail / formulaire), sans changer d'URL
  const [studentView, setStudentView] = useState(INITIAL_VIEW)
  const [userView, setUserView] = useState(INITIAL_VIEW)
  const [formationView, setFormationView] = useState(INITIAL_VIEW)
  const [inscriptionView, setInscriptionView] = useState(INITIAL_VIEW)

// Préférences d'affichage (page Paramètres), relues depuis le localStorage au démarrage
const [settings, setSettings] = useState(function () {
  try {
    const savedTheme = localStorage.getItem('app_theme')
    const savedColor = localStorage.getItem('app_color')
    const savedLogo = localStorage.getItem('app_logo')
    const savedFontSize = localStorage.getItem('app_font_size')
    const savedDensity = localStorage.getItem('app_density')
    const savedSidebar = localStorage.getItem('app_sidebar_collapsed')

    return {
      theme: savedTheme || 'light',
      color: savedColor || '#063a5c',
      logo: savedLogo || null,
      fontSize: savedFontSize || 'normale',
      density: savedDensity || 'confortable',
      collapsedSidebar: savedSidebar === 'true',
    }
  } catch {
    return {
      theme: 'light',
      color: '#063a5c',
      logo: null,
      fontSize: 'normale',
      density: 'confortable',
      collapsedSidebar: false,
    }
  }
})
 // À chaque changement des préférences : application sur <html> (attributs data-* et
 // variable CSS --accent utilisés par les feuilles de style) puis sauvegarde
 useEffect(function () {
  const root = document.documentElement

  // 1. Thème
  root.dataset.theme = settings.theme

  // 2. Couleur principale
  root.style.setProperty('--accent', settings.color)

  // 3. Taille de police
  root.dataset.fontSize = settings.fontSize || 'normale'

  // 4. Densité
  root.dataset.density = settings.density || 'confortable'

  // 5. Sidebar réduite
  root.dataset.sidebar = settings.collapsedSidebar ? 'collapsed' : 'expanded'

  // Persistance
  try {
    localStorage.setItem('app_theme', settings.theme)
    localStorage.setItem('app_color', settings.color)
    localStorage.setItem('app_font_size', settings.fontSize || 'normale')
    localStorage.setItem('app_density', settings.density || 'confortable')
    localStorage.setItem('app_sidebar_collapsed', String(!!settings.collapsedSidebar))

    if (settings.logo) {
      localStorage.setItem('app_logo', settings.logo)
    }
  } catch {
    // Les préférences restent actives pendant la session si le stockage est indisponible.
  }
}, [settings])

  // Changent la vue d'une section, ex. openStudentView('detail', 12)
  function openStudentView(type, id) {
    if (id === undefined) {
      id = null
    }
    setStudentView({ type: type, id: id })
  }

  function openUserView(type, id) {
    if (id === undefined) {
      id = null
    }
    setUserView({ type: type, id: id })
  }

  function openFormationView(type, id) {
    if (id === undefined) {
      id = null
    }
    setFormationView({ type: type, id: id })
  }

  function openInscriptionView(type, id) {
    if (id === undefined) {
      id = null
    }
    setInscriptionView({ type: type, id: id })
  }

  // Choisissent le composant à afficher selon la vue courante de la section
  function renderStudentPage() {
    const type = studentView.type
    const id = studentView.id

    if (type === 'detail') {
      return (
        <EtudiantDetail
          user={currentUser}
          studentId={id}
          onBack={function () { openStudentView('list') }}
          onEdit={function (studentId) { openStudentView('edit', studentId) }}
        />
      )
    }

    if (type === 'create' || type === 'edit') {
      return (
        <EtudiantForm
          user={currentUser}
          studentId={id}
          onBack={function () { openStudentView('list') }}
          onSaved={function () { openStudentView('list') }}
        />
      )
    }

    return (
      <Etudiants
        user={currentUser}
        onCreate={function () { openStudentView('create') }}
        onDetail={function (studentId) { openStudentView('detail', studentId) }}
        onEdit={function (studentId) { openStudentView('edit', studentId) }}
      />
    )
  }

  function renderUserPage() {
    const type = userView.type
    const id = userView.id

    if (type === 'create' || type === 'edit') {
      return (
        <UserForm
          user={currentUser}
          userId={id}
          onBack={function () { openUserView('list') }}
          onSaved={function () { openUserView('list') }}
        />
      )
    }

    return (
      <Users
        user={currentUser}
        onCreate={function () { openUserView('create') }}
        onEdit={function (userId) { openUserView('edit', userId) }}
      />
    )
  }

  function renderFormationPage() {
    const type = formationView.type
    const id = formationView.id

    if (type === 'detail') {
      return (
        <FormationDetail
          user={currentUser}
          formationId={id}
          onBack={function () { openFormationView('list') }}
          onEdit={function (formationId) { openFormationView('edit', formationId) }}
        />
      )
    }

    if (type === 'create' || type === 'edit') {
      return (
        <FormationForm
          user={currentUser}
          formationId={id}
          onBack={function () { openFormationView('list') }}
          onSaved={function () { openFormationView('list') }}
        />
      )
    }

    return (
      <Formations
        user={currentUser}
        onCreate={function () { openFormationView('create') }}
        onDetail={function (formationId) { openFormationView('detail', formationId) }}
        onEdit={function (formationId) { openFormationView('edit', formationId) }}
      />
    )
  }

  function renderInscriptionPage() {
    const type = inscriptionView.type
    const id = inscriptionView.id

    if (type === 'detail') {
      return (
        <InscriptionDetail
          user={currentUser}
          inscriptionId={id}
          onBack={function () { openInscriptionView('list') }}
        />
      )
    }

    if (type === 'create') {
      return (
        <InscriptionForm
          user={currentUser}
          onBack={function () { openInscriptionView('list') }}
          onSaved={function () { openInscriptionView('list') }}
        />
      )
    }

    return (
      <Inscriptions
        user={currentUser}
        onCreate={function () { openInscriptionView('create') }}
        onDetail={function (inscriptionId) { openInscriptionView('detail', inscriptionId) }}
      />
    )
  }

  return (
    <ProfileProvider value={{ onProfile: function () { setIsProfileOpen(true) }, updateCurrentUser }}>
    <main className="dashboard-page">
      <Sidebar
        user={currentUser}
        onLogout={onLogout}
        logo={settings.logo || logoImtech}
        nbNotifs={unreadNotifications.length}
      />

      <Routes>
        {/* Accueil : espace formateur pour un formateur, tableau de bord pour les autres */}
        <Route
          path="/"
          element={currentUser.role === 'Formateur'
            ? <AccueilFormateur user={currentUser} />
            : <DashboardContent user={currentUser} />}
        />
        <Route path="etudiants" element={renderStudentPage()} />
        <Route path="utilisateurs" element={renderUserPage()} />
        <Route path="formations" element={renderFormationPage()} />
        <Route path="inscriptions" element={renderInscriptionPage()} />
        <Route path="paiements" element={<Paiements user={currentUser} />} />
        <Route path="echeances" element={<Echeances user={currentUser} />} />
        <Route path="documents" element={<Documents user={currentUser} />} />
        <Route path="assistance" element={<Assistance user={currentUser} />} />
        <Route path="formateur" element={<AccueilFormateur user={currentUser} />} />
        <Route path="supports" element={<SupportsFormateur user={currentUser} />} />
        <Route path="programmes" element={<ProgrammesFormateur user={currentUser} />} />
        <Route path="notifications" element={<Notifications user={currentUser} />} />
        <Route
          path="parametres"
          element={<Parametres user={currentUser} settings={settings} onSettingsChange={setSettings} />}
        />
      </Routes>

      {isProfileOpen && (
        <ProfileModal
          user={currentUser}
          onClose={function () { setIsProfileOpen(false) }}
          onUpdated={function (updatedUser) { setCurrentUser(updatedUser); setIsProfileOpen(false) }}
        />
      )}
    </main>
    </ProfileProvider>
  )
}

export default DashboardLayout