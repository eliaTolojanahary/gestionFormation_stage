import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logoImtech from '../../assets/logoImtech.png'
import Icon from '../../components/icon/Icon'
import './Login.css'

// Page de connexion. La connexion elle-même est faite par onLogin (useAuth, dans App) ;
// cette page vérifie seulement que les champs sont remplis.
function Login({ onLogin, isLoading, error }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [formError, setFormError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (!email.trim() || !password) {
      setFormError('Veuillez renseigner votre adresse e-mail et votre mot de passe.')
      return
    }

    onLogin(email, password, rememberMe)
  }

  // Erreur de saisie en priorité, sinon erreur renvoyée par le serveur
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
        <footer><p>Gerez vos catalogues de cours, planifiez vos sessions de formation,<br />et suivez la progression de vos apprenants en toute simplicite</p><small>&copy; 2026 IMTECH INFO. Tous droits reserves.</small></footer>
      </section>

      <section className="form-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="form-heading"><h2>Connexion</h2><p>Veuillez vous connecter pour acceder a votre espace de gestion.</p></div>
          {displayedError && <div className="form-message error" role="alert">{displayedError}</div>}

          <label htmlFor="email">Adresse e-mail</label>
          <div className="input-wrap"><Icon name="card" /><input id="email" type="email" placeholder="exemple@imtech.info" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></div>

          <label htmlFor="password">Mot de passe</label>
          <div className="input-wrap"><Icon name="card" /><input id="password" type={showPassword ? 'text' : 'password'} placeholder="********" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /><button className="icon-button" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label="Afficher ou masquer le mot de passe">◉</button></div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
              <span>Se souvenir de moi</span>
            </label>
            <button className="text-button" type="button" onClick={() => navigate('/forgot-password')}>
              Mot de passe oublie ?
            </button>
          </div>
          <button className="submit-button" type="submit" disabled={isLoading}>{isLoading ? 'Connexion...' : 'Se connecter'}</button>
        </form>
      </section>
    </main>
  )
}

export default Login