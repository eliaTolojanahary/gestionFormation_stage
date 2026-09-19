import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InputReutilisable from '../form/InputReutilisable'
import { useUser } from '../../hooks/useUser'
import Modal from '../modal/Modal'
import './ProfileModal.css'
import { getFileUrl } from '../../utils/files'
import { useProfile } from './ProfileContext'
import ImageLightbox from '../form/ImageLightBox'
function ProfileModal({ user, onClose, onUpdated }) {
  const navigate = useNavigate()
  const { updateCurrentUser } = useProfile() || {}
  const { getUser, updateUser, isLoading: isUpdatingUser, error: userError } = useUser()

  const [profile, setProfile] = useState(user || {})
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [file, setFile] = useState(null)

  const [message, setMessage] = useState('')
  const [localError, setLocalError] = useState('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [previewImage, setPreviewImage] = useState(null)
  useEffect(() => {
  const userId = user?.id || user?.id_utilisateur
  if (userId) {
    getUser(userId)
      .then((data) => {
        if (data) {
          setProfile(() => ({
            ...data,      // les données fraîches du serveur écrasent maintenant l'ancien
            id_role: String(data.id_role || user?.id_role || '')
          }))
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingProfile(false))
  } else {
    setIsLoadingProfile(false)
  }
}, [getUser, user])

  function handleChange(e) {
    const name = e?.target ? e.target.name : e?.name
    const value = e?.target ? e.target.value : e?.value

    if (name) {
      setProfile((current) => ({ ...current, [name]: value }))
    }
  }

  function handleFileChange(name, selectedFile) {
    setFile(selectedFile)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setLocalError('')

    if (oldPassword || newPassword) {
      if (!oldPassword) {
        setLocalError('Veuillez saisir votre ancien mot de passe.')
        return
      }
      if (newPassword.length < 8) {
        setLocalError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('nom', profile.nom || '')
      formData.append('prenom', profile.prenom || '')
      formData.append('email', profile.email || '')
      formData.append('telephone', profile.telephone || '')
      
      if (profile.id_role) {
        formData.append('id_role', profile.id_role)
      }

      if (oldPassword) {
        formData.append('ancien_mot_de_passe', oldPassword)
      }
      if (newPassword) {
        formData.append('mot_de_passe', newPassword)
      }

      if (file) {
        formData.append('photo', file)
      }

      const id = profile.id || profile.id_utilisateur
      // Récupération de la réponse du serveur
      const response = await updateUser(id, formData)
      const updatedUser = updateCurrentUser({
        ...user,
        ...profile,
        ...(response?.data?.photo ? { photo: response.data.photo } : {}),
        id,
        role: profile.role || profile.role_nom || user?.role,
      })

      onUpdated(updatedUser)
      setMessage('Profil mis à jour avec succès.')
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err) {
      setLocalError(err.message || 'Une erreur est survenue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayedError = localError || userError

  // Calcul dynamique de l'URL de l'image (fichier local en priorité, sinon image distante)
  const previewUrl = file 
    ? URL.createObjectURL(file) 
    : (profile.photo ? getFileUrl(profile.photo) : null)
function handlePhotoClick() {
    if (previewUrl) {
      setPreviewImage(previewUrl)
    }
  }
  return (
    <Modal eyebrow="Mon compte" title="Profil utilisateur" titleId="profile-title" onClose={onClose}>
      {isLoadingProfile ? (
        <p>Chargement du profil...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="profile-form-grid">
<div 
                className="profile-photo-preview" 
                onClick={handlePhotoClick} 
                style={{ cursor: previewUrl ? 'pointer' : 'default' }}
                title={previewUrl ? 'Cliquer pour agrandir' : ''}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Photo de profil" />
                ) : (
                  <span>{profile.prenom?.[0] || 'U'}</span>
                )}
              </div>
            <InputReutilisable label="Nom" name="nom" value={profile.nom || ''} onChange={handleChange} required />
            <InputReutilisable label="Prénom" name="prenom" value={profile.prenom || ''} onChange={handleChange} required />
            <InputReutilisable label="Email" name="email" type="email" value={profile.email || ''} onChange={handleChange} required />
            <InputReutilisable label="Téléphone" name="telephone" value={profile.telephone || ''} onChange={handleChange} />

            <InputReutilisable
              as="file"
              label="Photo de profil"
              name="photo"
              file={file}
              currentPath={profile.photo}
              onChange={handleFileChange}
              accept="image/*"
            />
          </div>
          <div className="profile-modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="primary-button" disabled={isSubmitting || isUpdatingUser}>
              {isSubmitting || isUpdatingUser ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
      <ImageLightbox
        src={previewImage}
        alt="Photo de profil agrandie"
        onClose={() => setPreviewImage(null)}
      />
    </Modal>

    
  
  )
}

export default ProfileModal