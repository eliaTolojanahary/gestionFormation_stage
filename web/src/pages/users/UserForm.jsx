import { useEffect, useState } from 'react'
import Header from '../../components/header/Header'
import Informations from '../../components/form/Informations'
import InputReutilisable from '../../components/form/InputReutilisable'
import { useUser } from '../../hooks/useUser'
import './Users.css'

const EMPTY_FORM = { nom: '', prenom: '', email: '', mot_de_passe: '', telephone: '', id_role: '' }
const ROLE_OPTIONS = [{ value: '1', label: 'Super Admin' }, { value: '2', label: 'Accueil' }, { value: '3', label: 'Formateur' }, { value: '4', label: 'Étudiant' }]

function UserForm({ user, userId, onBack, onSaved }) {
  const isEdit = Boolean(userId)
  const { getUser, createUser, updateUser } = useUser()
  const [form, setForm] = useState(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    getUser(userId).then((data) => setForm((current) => ({ ...current, ...data, id_role: String(data.id_role || '') }))).catch((requestError) => setError(requestError.message)).finally(() => setIsLoading(false))
  }, [isEdit, userId])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      const payload = { nom: form.nom, prenom: form.prenom, email: form.email, telephone: form.telephone, id_role: Number(form.id_role) }
      if (!isEdit) payload.mot_de_passe = form.mot_de_passe
      await (isEdit ? updateUser(userId, payload) : createUser(payload))
      onSaved()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <main className="users-page"><Header user={user} activeItem="Utilisateurs" /><p>Chargement...</p></main>

  return <main className="users-page"><Header user={user} activeItem="Utilisateurs" /><div className="page-heading"><div><button type="button" className="back-link" onClick={onBack}>← Retour aux utilisateurs</button><h1>{isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}</h1><p>Gérer les informations et les droits d'accès.</p></div></div><form className="user-form" onSubmit={handleSubmit}><Informations title="Informations du compte"><div className="form-grid"><InputReutilisable label="Nom" name="nom" value={form.nom} onChange={handleChange} required /><InputReutilisable label="Prénom" name="prenom" value={form.prenom} onChange={handleChange} required /><InputReutilisable label="Email" name="email" type="email" value={form.email} onChange={handleChange} required /><InputReutilisable label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} /><InputReutilisable label="Rôle" name="id_role" as="select" value={form.id_role} onChange={handleChange} options={ROLE_OPTIONS} required />{!isEdit && <InputReutilisable label="Mot de passe" name="mot_de_passe" type="password" value={form.mot_de_passe} onChange={handleChange} required />}</div></Informations>{error && <p className="form-error">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={onBack}>Annuler</button><button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</button></div></form></main>
}

export default UserForm