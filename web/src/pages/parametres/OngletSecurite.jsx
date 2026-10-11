import { useEffect, useState } from 'react'
import Icon from '../../components/icon/Icon'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../utils/time'
import { nomNavigateur, nomSysteme } from '../../utils/appareil'
import FormulaireMotDePasse from './FormulaireMotDePasse'

// Onglet Sécurité : changement de mot de passe, dernière connexion, déconnexion globale et
// historique des sessions. Les sessions sont chargées à l'ouverture de l'onglet.
function OngletSecurite() {
  const { logoutAll, getLastLogin, getSessions } = useAuth()
  const [sessions, setSessions] = useState([])
  const [lastLogin, setLastLogin] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [erreur, setErreur] = useState('')
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false)

  // Sessions + dernière connexion (au montage et après « Se déconnecter partout »)
  async function chargerSessions() {
    const [sessionsData, lastLoginData] = await Promise.all([getSessions(), getLastLogin()])
    return { sessionsData, lastLoginData }
  }

  useEffect(() => {
    let annule = false
    chargerSessions()
      .then(({ sessionsData, lastLoginData }) => {
        if (annule) return
        setSessions(sessionsData)
        setLastLogin(lastLoginData)
      })
      .catch((err) => {
        if (!annule) setErreur(err.message || 'Impossible de charger les sessions.')
      })
      .finally(() => {
        if (!annule) setIsLoading(false)
      })
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogoutAll() {
    if (!window.confirm('Déconnecter toutes les autres sessions actives ?')) return

    setIsLoggingOutAll(true)
    setErreur('')
    try {
      await logoutAll()
      const { sessionsData, lastLoginData } = await chargerSessions()
      setSessions(sessionsData)
      setLastLogin(lastLoginData)
    } catch (err) {
      setErreur(err.message || 'Impossible de déconnecter les sessions.')
    } finally {
      setIsLoggingOutAll(false)
    }
  }

  return (
    <section className="workspace-panel settings-section">
      <div className="panel-heading">
        <div>
          <h2>Sécurité du compte</h2>
          <p>Gérez vos accès, mots de passe et sessions actives.</p>
        </div>
        <Icon name="gear" />
      </div>

      {/* 1. Changement de mot de passe */}
      <FormulaireMotDePasse />

      {/* 2. Dernière connexion */}
      <div className="setting-line">
        <div>
          <strong>Dernière connexion</strong>
          <small>Dernière activité enregistrée sur votre profil.</small>
        </div>
        <span className="session-meta">
          {isLoading
            ? 'Chargement…'
            : lastLogin
              ? `${formatDate(lastLogin.cree_le)} • ${nomNavigateur(lastLogin.user_agent)} ${nomSysteme(lastLogin.user_agent)}`
              : 'Aucune donnée'}
        </span>
      </div>

      {/* 3. Déconnexion globale */}
      <div className="setting-line">
        <div>
          <strong>Déconnexion globale</strong>
          <small>Déconnectez votre compte de tous les autres appareils et navigateurs.</small>
        </div>
        <button className="secondary-button" type="button" disabled={isLoggingOutAll} onClick={handleLogoutAll}>
          {isLoggingOutAll ? 'Déconnexion…' : 'Se déconnecter partout'}
        </button>
      </div>

      {/* 4. Historique des connexions */}
      <div className="setting-line" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div>
          <strong>Historique des connexions</strong>
          <small>Aperçu des dernières sessions ouvertes sur votre compte.</small>
        </div>

        {erreur && (
          <div className="form-message error" role="alert" style={{ marginTop: '10px' }}>
            {erreur}
          </div>
        )}

        <div className="ticket-list" style={{ marginTop: '10px' }}>
          {isLoading && <div className="session-empty">Chargement des sessions…</div>}

          {!isLoading && sessions.length === 0 && (
            <div className="session-empty">Aucune session enregistrée.</div>
          )}

          {!isLoading && sessions.map((s) => (
            <div key={s.id_session} className="ticket-row" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
              <div>
                <strong>
                  {nomNavigateur(s.user_agent)}
                  {nomSysteme(s.user_agent) ? ` - ${nomSysteme(s.user_agent)}` : ''}
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
  )
}

export default OngletSecurite
