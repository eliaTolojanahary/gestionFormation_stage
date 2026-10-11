import { useRef, useState,useEffect } from 'react'
import Icon from '../../components/icon/Icon'
import Header from '../../components/header/Header'
import logoImtech from '../../assets/logoImtech.png'
import './Parametres.css'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../utils/time'
import FondVitrine from './FondVitrine'

// Couleurs proposées pour la couleur principale de l'interface
const colorOptions = [
  { name: 'Bleu IMTECH', value: '#063a5c' },
  { name: 'Bleu azur', value: '#137c8b' },
  { name: 'Vert formation', value: '#2d8066' },
  { name: 'Bordeaux', value: '#8e3b54' },
  { name: 'Jaune', value: '#e2a019' },
  { name: 'Gris', value: '#546e7a' },
  { name: 'Rouge', value: '#d32f2f' },
]

// Page Paramètres, deux onglets :
//  - Apparence : thème, couleur, taille du texte, densité, menu réduit, logo
//    (+ fond de la vitrine mobile pour le Super Admin, enregistré sur le serveur)
//    (appliqués et sauvegardés par DashboardLayout via onSettingsChange) ;
//  - Sécurité : changement de mot de passe, dernière connexion, sessions, déconnexion globale.
function Parametres({ user, settings, onSettingsChange }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const{logoutAll,getLastLogin,getSessions}=useAuth()
  const [activeTab, setActiveTab] = useState('apparence') // 'apparence' | 'securite'
  const [saved, setSaved] = useState(false)
  const{changePassword}=useAuth()
  const logo = settings.logo || logoImtech
const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' })
  const [passwordMessage, setPasswordMessage] = useState('')  
  const [passwordError, setPasswordError] = useState('')       
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)  

   const [sessions, setSessions] = useState([])
  const [lastLogin, setLastLogin] = useState(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [sessionsError, setSessionsError] = useState('')
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false)
 // Sessions et dernière connexion chargées seulement à l'ouverture de l'onglet Sécurité
 useEffect(() => {
    if (activeTab !== 'securite') return

    let cancelled = false

    async function load() {
      setIsLoadingSessions(true)
      setSessionsError('')
      try {
        const [sessionsData, lastLoginData] = await Promise.all([
          getSessions(),
          getLastLogin(),
        ])
        if (cancelled) return
        setSessions(sessionsData)
        setLastLogin(lastLoginData)
      } catch (err) {
        if (!cancelled) {
          setSessionsError(err.message || 'Impossible de charger les sessions.')
        }
      } finally {
        if (!cancelled) setIsLoadingSessions(false)
      }
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])
  // Modifie une préférence et affiche "Modifications enregistrées" pendant 1,8 s
  function changeSetting(key, value) {
    onSettingsChange({ ...settings, [key]: value })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }
async function handleLogoutAll() {
    if (!window.confirm('Déconnecter toutes les autres sessions actives ?')) return

    setIsLoggingOutAll(true)
    setSessionsError('')
    try {
      await logoutAll()

      // Recharger les sessions après la déconnexion globale
      const [sessionsData, lastLoginData] = await Promise.all([
        getSessions(),
        getLastLogin(),
      ])
      setSessions(sessionsData)
      setLastLogin(lastLoginData)
    } catch (err) {
      setSessionsError(err.message || 'Impossible de déconnecter les sessions.')
    } finally {
      setIsLoggingOutAll(false)
    }
  }
 // Nom du navigateur lisible à partir du user-agent ("Edg" testé avant "Chrome",
 // car le user-agent d'Edge contient aussi "Chrome")
 function shortUserAgent(ua) {
    if (!ua) return 'Appareil inconnu'
    if (ua.includes('Edg')) return 'Edge'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    return ua.slice(0, 40)
  }

  // Système d'exploitation à partir du user-agent
  function shortOS(ua) {
    if (!ua) return ''
    if (ua.includes('Windows')) return 'Windows'
    if (ua.includes('Mac OS')) return 'macOS'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
    if (ua.includes('Linux')) return 'Linux'
    return ''
  }
  // Le logo est converti en texte base64 (data URL) pour être gardé dans le localStorage
  function handleLogo(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => changeSetting('logo', reader.result)
    reader.readAsDataURL(file)
  }

async function handlePasswordSubmit(event) {
  event.preventDefault()
  setPasswordMessage('')
  setPasswordError('')

  // Validations front
  if (!passwordForm.current) {
    setPasswordError('Veuillez saisir votre mot de passe actuel.')
    return
  }
  if (passwordForm.newPass.length < 8) {
    setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
    return
  }
  if (passwordForm.newPass !== passwordForm.confirm) {
    setPasswordError('Les deux mots de passe ne correspondent pas.')
    return
  }

  setIsUpdatingPassword(true)

  try {

    await changePassword(passwordForm.current, passwordForm.newPass)

    setPasswordMessage('Mot de passe mis à jour avec succès.')
    setPasswordForm({ current: '', newPass: '', confirm: '' })
    setTimeout(() => setPasswordMessage(''), 2500)
  } catch (err) {
    setPasswordError(err.message || 'Une erreur est survenue.')
  } finally {
    setIsUpdatingPassword(false)
  }
}
  return (
    <section className="workspace-page">
      <Header user={user} activeItem="Parametres" />

      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Préférences du compte</span>
          <h1>Paramètres</h1>
          <p>Adaptez l'interface et les préférences de votre espace de travail.</p>
        </div>
      </div>

      <div className="settings-layout">
        {/* Navigation latérale */}
        <div className="settings-menu">
          <button
            className={`settings-menu-item ${activeTab === 'apparence' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('apparence')}
          >
            <Icon name="palette" /> Apparence
          </button>
          <button
            className={`settings-menu-item ${activeTab === 'securite' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('securite')}
          >
            <Icon name="gear" /> Sécurité
          </button>
        </div>

        <div className="settings-content">
          {/* ================= ONGLET APPARENCE ================= */}
          {activeTab === 'apparence' && (
            <section className="workspace-panel settings-section">
              <div className="panel-heading">
                <div>
                  <h2>Apparence de la plateforme</h2>
                  <p>Personnalisez l'identité visuelle et l'ergonomie de votre espace.</p>
                </div>
                <Icon name="palette" />
              </div>

              {/* Mode clair / sombre */}
              <div className="setting-line">
                <div>
                  <strong>Mode d'affichage</strong>
                  <small>Choisissez le confort visuel qui vous convient.</small>
                </div>
                <div className="mode-options">
                  <button
                    className={settings.theme === 'light' ? 'selected' : ''}
                    type="button"
                    onClick={() => changeSetting('theme', 'light')}
                  >
                    <Icon name="sun" /> Clair
                  </button>
                  <button
                    className={settings.theme === 'dark' ? 'selected' : ''}
                    type="button"
                    onClick={() => changeSetting('theme', 'dark')}
                  >
                    <Icon name="moon" /> Sombre
                  </button>
                </div>
              </div>

              {/* Couleur principale */}
              <div className="setting-line">
                <div>
                  <strong>Couleur principale</strong>
                  <small>Utilisée pour les éléments actifs et les actions.</small>
                </div>
                <div className="color-options">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      className={settings.color === color.value ? 'selected' : ''}
                      type="button"
                      title={color.name}
                      style={{ '--swatch': color.value }}
                      onClick={() => changeSetting('color', color.value)}
                    >
                      <span />
                    </button>
                  ))}
                </div>
              </div>

              {/* Taille du texte */}
              <div className="setting-line">
                <div>
                  <strong>Taille du texte</strong>
                  <small>Ajustez la taille globale de la police d'écriture.</small>
                </div>
                <div className="mode-options">
                  {['petite', 'normale', 'grande'].map((size) => (
                    <button
                      key={size}
                      className={(settings.fontSize || 'normale') === size ? 'selected' : ''}
                      type="button"
                      onClick={() => changeSetting('fontSize', size)}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Densité de l'interface */}
              <div className="setting-line">
                <div>
                  <strong>Densité de l'interface</strong>
                  <small>Choisissez l'espacement entre les éléments.</small>
                </div>
                <div className="mode-options">
                  <button
                    className={(settings.density || 'confortable') === 'compacte' ? 'selected' : ''}
                    type="button"
                    onClick={() => changeSetting('density', 'compacte')}
                  >
                    Compacte
                  </button>
                  <button
                    className={(settings.density || 'confortable') === 'confortable' ? 'selected' : ''}
                    type="button"
                    onClick={() => changeSetting('density', 'confortable')}
                  >
                    Confortable
                  </button>
                </div>
              </div>

              {/* Sidebar réduite */}
              <div className="setting-line">
                <div>
                  <strong>Sidebar réduite par défaut</strong>
                  <small>Affiche uniquement les icônes dans le menu latéral.</small>
                </div>
                <div className="mode-options">
                  <button
                    className={settings.collapsedSidebar ? 'selected' : ''}
                    type="button"
                    onClick={() => changeSetting('collapsedSidebar', !settings.collapsedSidebar)}
                  >
                    {settings.collapsedSidebar ? 'Activée' : 'Désactivée'}
                  </button>
                </div>
              </div>

              {/* Logo de l'organisation */}
              <div className="setting-line logo-setting">
                <div>
                  <strong>Logo de l'organisation</strong>
                  <small>PNG ou JPG, recommandé en format carré.</small>
                </div>
                <div className="logo-control">
                  <img src={logo} alt="Logo actuel" />
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => inputRef.current?.click()}
                  >
                    <Icon name="upload" /> Remplacer
                  </button>
                  <input
                    ref={inputRef}
                    className="visually-hidden"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleLogo}
                  />
                </div>
              </div>

              {/* Fond du bandeau « Découvrir » de l'application mobile (Super Admin) */}
              {user?.role === 'Super Admin' && (
                <FondVitrine
                  onSaved={() => {
                    setSaved(true)
                    window.setTimeout(() => setSaved(false), 1800)
                  }}
                />
              )}
            </section>
          )}

 {activeTab === 'securite' && (
            <section className="workspace-panel settings-section">
              <div className="panel-heading">
                <div>
                  <h2>Sécurité du compte</h2>
                  <p>Gérez vos accès, mots de passe et sessions actives.</p>
                </div>
                <Icon name="gear" />
              </div>

              {/* 1. Changement de mot de passe */}
              <div className="setting-line" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div>
                  <strong>Changement de mot de passe</strong>
                  <small>Modifiez votre mot de passe régulièrement pour sécuriser votre compte.</small>
                </div>

                {passwordError && (
                  <div className="form-message error" role="alert" style={{ marginTop: '10px' }}>
                    {passwordError}
                  </div>
                )}
                {passwordMessage && (
                  <div className="form-message success" role="status" style={{ marginTop: '10px' }}>
                    {passwordMessage}
                  </div>
                )}

                <form
                  className="settings-form"
                  style={{ marginTop: '12px' }}
                  onSubmit={handlePasswordSubmit}
                >
                  <label>
                    Mot de passe actuel
                    <input
                      type="password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      autoComplete="current-password"
                      required
                    />
                  </label>

                  <button
                    className="back-link"
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    style={{ justifySelf: 'end', alignSelf: 'end' }}
                  >
                    Mot de passe oublié ?
                  </button>

                  <label>
                    Nouveau mot de passe
                    <input
                      type="password"
                      value={passwordForm.newPass}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                      autoComplete="new-password"
                      required
                    />
                  </label>

                  <label style={{ gridColumn: 'span 2' }}>
                    Confirmer le nouveau mot de passe
                    <input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      autoComplete="new-password"
                      required
                    />
                  </label>

                  <button
                    className="primary-button"
                    type="submit"
                    disabled={isUpdatingPassword}
                    style={{ justifySelf: 'start' }}
                  >
                    {isUpdatingPassword ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                  </button>
                </form>
              </div>

              {/* 2. Dernière connexion */}
              <div className="setting-line">
                <div>
                  <strong>Dernière connexion</strong>
                  <small>Dernière activité enregistrée sur votre profil.</small>
                </div>
                <span className="session-meta">
                  {isLoadingSessions
                    ? 'Chargement…'
                    : lastLogin
                      ? `${formatDate(lastLogin.cree_le)} • ${shortUserAgent(lastLogin.user_agent)} ${shortOS(lastLogin.user_agent)}`
                      : 'Aucune donnée'}
                </span>
              </div>

              {/* 3. Déconnexion globale */}
              <div className="setting-line">
                <div>
                  <strong>Déconnexion globale</strong>
                  <small>Déconnectez votre compte de tous les autres appareils et navigateurs.</small>
                </div>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={isLoggingOutAll}
                  onClick={handleLogoutAll}
                >
                  {isLoggingOutAll ? 'Déconnexion…' : 'Se déconnecter partout'}
                </button>
              </div>

              {/* 4. Historique des connexions */}
              <div className="setting-line" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div>
                  <strong>Historique des connexions</strong>
                  <small>Aperçu des dernières sessions ouvertes sur votre compte.</small>
                </div>

                {sessionsError && (
                  <div className="form-message error" role="alert" style={{ marginTop: '10px' }}>
                    {sessionsError}
                  </div>
                )}

                <div className="ticket-list" style={{ marginTop: '10px' }}>
                  {isLoadingSessions && (
                    <div className="session-empty">Chargement des sessions…</div>
                  )}

                  {!isLoadingSessions && sessions.length === 0 && (
                    <div className="session-empty">Aucune session enregistrée.</div>
                  )}

                  {!isLoadingSessions && sessions.map((s) => (
                    <div
                      key={s.id_session}
                      className="ticket-row"
                      style={{ gridTemplateColumns: '1fr 1fr auto' }}
                    >
                      <div>
                        <strong>
                          {shortUserAgent(s.user_agent)}
                          {shortOS(s.user_agent) ? ` - ${shortOS(s.user_agent)}` : ''}
                        </strong>
                        <small>
                          {s.ip || 'IP inconnue'} {s.est_courante ? '• Actuel' : ''}
                        </small>
                      </div>
                      <small>{formatDate(s.cree_le)}</small>
                      <span className={`status-pill ${s.actif ? 'resolu' : ''}`}>
                        {s.actif ? 'Actif' : 'Expiré'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Label de confirmation globale */}
          {saved && (
            <div className="saved-label" style={{ marginTop: '10px' }}>
              <Icon name="check" /> Modifications enregistrées !
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Parametres
