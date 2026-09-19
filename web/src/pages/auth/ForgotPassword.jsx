import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logoImtech from '../../assets/logoImtech.png'
import Icon from '../../components/icon/Icon'
import { useAuth } from '../../hooks/useAuth'
import './Login.css'

function ForgotPassword() {
  const navigate = useNavigate()
  const { forgotPassword, resetPassword, error } = useAuth()

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')

  async function handleSendEmail(event) {
    event.preventDefault()
    setFormError('')

    if (email.trim() === '') {
      setFormError('Veuillez renseigner votre adresse e-mail.')
      return
    }

    setIsLoading(true)
    const result = await forgotPassword(email)
    setIsLoading(false)

    if (result) {
      setMessage('Un code de réinitialisation a été envoyé à votre adresse e-mail.')
      setStep(2)
    }
  }

  async function handleReset(event) {
    event.preventDefault()
    setFormError('')

    if (token.trim() === '') {
      setFormError('Veuillez coller le code reçu par e-mail.')
      return
    }

    if (password.length < 8) {
      setFormError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }

    if (password !== passwordConfirmation) {
      setFormError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setIsLoading(true)
    const result = await resetPassword(token.trim(), password)
    setIsLoading(false)

    if (result) {
      setMessage('Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.')
      setStep(3)
    }
  }

  const displayedError = formError || error

  return (
    <main className="login-page">
      <section className="brand-panel" aria-label="Presentation de la plateforme">
        <div className="brand-content">
          <div className="brand-lockup">
            <img className="brand-logo" src={logoImtech} alt="Logo IMTECH INFO" />
            <h1>PLATEFORME<br />DE<br />GESTION<br />DE<br /><span>FORMATION</span></h1>
            
          </div>
                    <div className="pattern" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
        </div>
        <footer>
          <p>Gerez vos catalogues de cours, planifiez vos sessions de formation,<br />et suivez la progression de vos apprenants en toute simplicite</p>
          <small>&copy; 2026 IMTECH INFO. Tous droits reserves.</small>
        </footer>
      </section>

      <section className="form-panel">
        <div className="login-card recovery-card">
          <div className="form-heading">
            <h2>Mot de passe oublie</h2>
            {step === 1 && <p>Saisissez votre adresse e-mail pour recevoir un code.</p>}
            {step === 2 && <p>Collez le code reçu par e-mail et choisissez un nouveau mot de passe.</p>}
            {step === 3 && <p>Terminé !</p>}
          </div>

          {displayedError && <div className="form-message error" role="alert">{displayedError}</div>}
          {message && <div className="form-message success" role="status">{message}</div>}

          {step === 1 && (
            <form onSubmit={handleSendEmail}>
              <div className="input-wrap">
                <Icon name="users" />
                <input
                  id="recovery-email"
                  type="email"
                  placeholder="exemple@imtech.info"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                />
              </div>
              <button className="submit-button" type="submit" disabled={isLoading}>
                {isLoading ? 'Envoi...' : 'Envoyer le code'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleReset}>
              <label htmlFor="recovery-token">Code reçu par e-mail</label>
              <div className="input-wrap">
                <Icon name="check" />
                <input
                  id="recovery-token"
                  type="text"
                  placeholder="Collez le code ici"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                />
              </div>

              <label htmlFor="new-password">Nouveau mot de passe</label>
              <div className="input-wrap">
                <Icon name="card" />
                <input
                  id="new-password"
                  type="password"
                  placeholder="8 caractères minimum"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <label htmlFor="confirm-password">Confirmer le mot de passe</label>
              <div className="input-wrap">
                <Icon name="card" />
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Répétez le mot de passe"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <button className="submit-button" type="submit" disabled={isLoading}>
                {isLoading ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
              </button>

              <button className="text-button" type="button" onClick={() => setStep(1)}>
                Modifier l'e-mail
              </button>
            </form>
          )}

          {step === 3 && (
            <button className="submit-button" type="button" onClick={() => navigate('/login')}>
              Retour à la connexion
            </button>
          )}

          {step !== 3 && (
            <button className="back-login-button" type="button" onClick={() => navigate('/login')}>
              Retour à la connexion
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

export default ForgotPassword