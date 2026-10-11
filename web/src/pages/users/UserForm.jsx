import { useEffect, useState } from 'react'
import Header from '../../components/header/Header'
import Informations from '../../components/form/Informations'
import InputReutilisable from '../../components/form/InputReutilisable'
import { useUser } from '../../hooks/useUser'
import './Users.css'

const EMPTY_FORM = { nom: '', prenom: '', email: '', mot_de_passe: '', telephone: '', id_role: '', photo: '' }
// value = id_role en base
const ROLE_OPTIONS = [
  { value: '1', label: 'Super Admin' },
  { value: '2', label: 'Accueil' },
  { value: '3', label: 'Formateur' },
  { value: '4', label: 'Étudiant' },
]

// Formulaire de création / modification d'un compte (mode modification si userId est fourni).
// En modification, le mot de passe est facultatif : laissé vide, il n'est pas changé.
function UserForm({ user, userId, onBack, onSaved }) {
  const isEdit = Boolean(userId)
  const { getUser, createUser, updateUser } = useUser()
  const [form, setForm] = useState(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    getUser(userId)
      .then((data) =>
        setForm((current) => ({
          ...current,
          ...data,
          id_role: String(data.id_role || ''),
        }))
      )
      .catch((requestError) => setError(requestError.message))
      .finally(() => setIsLoading(false))
  }, [isEdit, userId])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleFileChange(name, selectedFile) {
    setFile(selectedFile)
  }

  // Envoi en FormData (photo facultative) ; le mot de passe n'est envoyé que s'il est rempli
  async function handleSubmit(event) {
  event.preventDefault()
  setError('')
  setIsSaving(true)

  try {
    const formData = new FormData()
    formData.append('nom', form.nom)
    formData.append('prenom', form.prenom)
    formData.append('email', form.email)
    if (form.mot_de_passe.trim()) {
      formData.append('mot_de_passe', form.mot_de_passe)
    }
    formData.append('telephone', form.telephone)
    formData.append('id_role', form.id_role)

   

    if (file) {
      formData.append('photo', file)
    }

    await (isEdit ? updateUser(userId, formData) : createUser(formData))
    onSaved()
  } catch (requestError) {
    setError(requestError.message)
  } finally {
    setIsSaving(false)
  }
}

  if (isLoading) {
    return (
      <main className="users-page">
        <Header user={user} activeItem="Utilisateurs" />
        <p>Chargement...</p>
      </main>
    )
  }

  return (
    <main className="users-page">
      <Header user={user} activeItem="Utilisateurs" />
      <div className="page-heading">
        <div>
          <button type="button" className="back-link" onClick={onBack}>
            ← Retour aux utilisateurs
          </button>
          <h1>{isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}</h1>
          <p>Gérer les informations et les droits d'accès.</p>
        </div>
      </div>

      <form className="user-form" onSubmit={handleSubmit}>
        <Informations title="Informations du compte">
          <div className="form-grid">
            <InputReutilisable label="Nom" name="nom" value={form.nom} onChange={handleChange} required />
            <InputReutilisable label="Prénom" name="prenom" value={form.prenom} onChange={handleChange} required />
            <InputReutilisable label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
            <InputReutilisable label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} />
            <InputReutilisable label="Rôle" name="id_role" as="select" value={form.id_role} onChange={handleChange} options={ROLE_OPTIONS} required />
            
            <InputReutilisable label={isEdit ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'} name="mot_de_passe" type="password" value={form.mot_de_passe} onChange={handleChange} required={!isEdit} />

            <InputReutilisable
              as="file"
              label="Photo de profil"
              name="photo"
              file={file}
              currentPath={form.photo}
              onChange={handleFileChange}
              accept="image/*"
            />
          </div>
        </Informations>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onBack}>
            Annuler
          </button>
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </main>
  )
}

export default UserForm