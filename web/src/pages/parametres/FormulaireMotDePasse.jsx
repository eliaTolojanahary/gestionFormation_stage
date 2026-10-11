import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const FORMULAIRE_VIDE = { current: '', newPass: '', confirm: '' }

// Changement de mot de passe (Paramètres > Sécurité) : vérifications dans le navigateur
// (8 caractères, confirmation), puis PUT /auth/change-password, qui déconnecte les autres appareils.
function FormulaireMotDePasse() {
  const navigate = useNavigate()
  const { changePassword } = useAuth()
  const [form, setForm] = useState(FORMULAIRE_VIDE)
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  const champ = (cle) => (e) => setForm({ ...form, [cle]: e.target.value })

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setErreur('')

    if (!form.current) return setErreur('Veuillez saisir votre mot de passe actuel.')
    if (form.newPass.length < 8) return setErreur('Le nouveau mot de passe doit contenir au moins 8 caractères.')
    if (form.newPass !== form.confirm) return setErreur('Les deux mots de passe ne correspondent pas.')

    setEnCours(true)
    try {
      await changePassword(form.current, form.newPass)
      setMessage('Mot de passe mis à jour avec succès.')
      setForm(FORMULAIRE_VIDE)
      setTimeout(() => setMessage(''), 2500)
    } catch (err) {
      setErreur(err.message || 'Une erreur est survenue.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="setting-line" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div>
        <strong>Changement de mot de passe</strong>
        <small>Modifiez votre mot de passe régulièrement pour sécuriser votre compte.</small>
      </div>

      {erreur && (
        <div className="form-message error" role="alert" style={{ marginTop: '10px' }}>
          {erreur}
        </div>
      )}
      {message && (
        <div className="form-message success" role="status" style={{ marginTop: '10px' }}>
          {message}
        </div>
      )}

      <form className="settings-form" style={{ marginTop: '12px' }} onSubmit={handleSubmit}>
        <label>
          Mot de passe actuel
          <input type="password" value={form.current} onChange={champ('current')} autoComplete="current-password" required />
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
          <input type="password" value={form.newPass} onChange={champ('newPass')} autoComplete="new-password" required />
        </label>

        <label style={{ gridColumn: 'span 2' }}>
          Confirmer le nouveau mot de passe
          <input type="password" value={form.confirm} onChange={champ('confirm')} autoComplete="new-password" required />
        </label>

        <button className="primary-button" type="submit" disabled={enCours} style={{ justifySelf: 'start' }}>
          {enCours ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
        </button>
      </form>
    </div>
  )
}

export default FormulaireMotDePasse
