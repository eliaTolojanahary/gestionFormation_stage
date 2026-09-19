import { useEffect, useState } from 'react'
import Header from '../../components/header/Header'
import Informations from '../../components/form/Informations'
import InputReutilisable from '../../components/form/InputReutilisable'
import { useEtudiant } from '../../hooks/useEtudiant'
import './Etudiants.css'

const EMPTY_FORM = {
  nom: '',
  prenom: '',
  email: '',
  mot_de_passe: '',
  telephone: '',
  id_role: '4',
  photo_1: '',
  photo_2: '',
  certificat_residence: '',
  photocopie_cin: ''
}

function EtudiantForm({ user, studentId, onBack, onSaved }) {
  const isEdit = Boolean(studentId)
  const { getEtudiant, createEtudiant, updateEtudiant } = useEtudiant()

  const [form, setForm] = useState(EMPTY_FORM)
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState({})

  useEffect(() => {
    if (!isEdit) return

    async function loadStudent() {
      try {
        const student = await getEtudiant(studentId)
        setForm((current) => ({ ...current, ...student, mot_de_passe: '' }))
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadStudent()
  }, [isEdit, studentId])

  
  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleFileChange(name, file) {
    setFiles((current) => ({ ...current, [name]: file }))
  }

async function handleSubmit(event) {
  event.preventDefault()
  setError('')
  setIsSaving(true)

  try {
    const formData = new FormData()
    console.log(formData)
   
    formData.append('nom', form.nom)
    formData.append('prenom', form.prenom)
    formData.append('email', form.email)
    formData.append('telephone', form.telephone)
    formData.append('id_role', form.id_role)

    if (!isEdit) {
      formData.append('mot_de_passe', form.mot_de_passe)
    }

    Object.entries(files).forEach(([key, file]) => {
      if (file) formData.append(key, file)
    })

    if (isEdit) {
      await updateEtudiant(studentId, formData)
    } else {
      await createEtudiant(formData)
    }

    onSaved()
  } catch (err) {
    setError(err.message)
  } finally {
    setIsSaving(false)
  }
}
  
  if (isLoading) {
    return (
      <main className="etudiant-page">
        <Header user={user} activeItem="Etudiants" />
        <p>Chargement...</p>
      </main>
    )
  }

  return (
    <main className="etudiant-page">
      <Header user={user} activeItem="Etudiants" />

      <div className="page-heading">
        <div>
          <button type="button" className="back-link" onClick={onBack}>
            ← Retour aux étudiants
          </button>
          <h1>{isEdit ? "Modifier l'étudiant" : 'Nouvel étudiant'}</h1>
          <p>
            {isEdit
              ? 'Les anciennes données sont chargées dans le formulaire.'
              : 'Créer un nouveau dossier étudiant.'}
          </p>
        </div>
      </div>

      <form className="student-form" onSubmit={handleSubmit}>
        <Informations title="Informations personnelles">
          <div className="form-grid">
            <InputReutilisable
              label="Nom"
              name="nom"
              value={form.nom}
              onChange={handleChange}
              required
            />
            <InputReutilisable
              label="Prénom"
              name="prenom"
              value={form.prenom}
              onChange={handleChange}
              required
            />
            <InputReutilisable
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <InputReutilisable
              label="Téléphone"
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
            />

            {!isEdit && (
              <InputReutilisable
                label="Mot de passe"
                name="mot_de_passe"
                type="password"
                value={form.mot_de_passe}
                onChange={handleChange}
                required
              />
            )}
            {!isEdit && (
              <InputReutilisable
                label=""
                name=""
                type="hidden"
                value={form.id_role}
                onChange={handleChange}
                required
              />
            )}
            <InputReutilisable
              as="file"
              label="Photo de profil"
              name="photo"
              file={files.photo}
              currentPath={form.photo}
              onChange={handleFileChange}
              accept="image/*"
            />
          </div>
        </Informations>

        <Informations title="Documents">
          <div className="form-grid">
          <InputReutilisable as="file" label="Photo principale" name="photo_1" file={files.photo_1} currentPath={form.photo_1} onChange={handleFileChange} accept="image/*" />
            <InputReutilisable as="file" label="Photo secondaire" name="photo_2" file={files.photo_2} currentPath={form.photo_2} onChange={handleFileChange} accept="image/*" />
            <InputReutilisable as="file" label="Certificat de résidence" name="certificat_residence" file={files.certificat_residence} currentPath={form.certificat_residence} onChange={handleFileChange} accept="image/*,.pdf" />
            <InputReutilisable as="file" label="Photocopie CIN" name="photocopie_cin" file={files.photocopie_cin} currentPath={form.photocopie_cin} onChange={handleFileChange} accept="image/*,.pdf" />
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

export default EtudiantForm