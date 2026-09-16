import { useEffect, useState } from 'react'
import InputReutilisable from '../form/InputReutilisable'
import { useProfil } from '../../hooks/useProfil'
import Modal from '../modal/Modal'
import './ProfileModal.css'

function ProfileModal({ user, onClose, onUpdated }) {
  const { getProfil, updateProfil, isLoading, error } = useProfil()
  const [profile, setProfile] = useState(user || {})
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  useEffect(() => {
    getProfil()
      .then((data) => setProfile((current) => ({ ...current, ...data })))
      .catch(() => {})
      .finally(() => setIsLoadingProfile(false))
  }, [getProfil])

  function handleChange(event) {
    setProfile((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    try {
      const payload = {
        nom: profile.nom || '',
        prenom: profile.prenom || '',
        email: profile.email || '',
        telephone: profile.telephone || '',
        id_role: profile.id_role,
      }
      await updateProfil(profile.id || profile.id_utilisateur, payload)
      const updatedUser = { ...user, ...profile, id: profile.id || profile.id_utilisateur, role: profile.role || profile.role_nom }
      onUpdated(updatedUser)
      setMessage(password ? 'Nom et prénom modifiés. Le mot de passe nécessite une route backend dédiée.' : 'Profil modifié avec succès.')
      setPassword('')
    } catch {
      // The hook exposes the request error in the modal.
    }
  }

  return (
    <Modal eyebrow="Mon compte" title="Profil utilisateur" titleId="profile-title" onClose={onClose}>
        {isLoadingProfile ? <p>Chargement du profil...</p> : <form onSubmit={handleSubmit}>
          <div className="profile-form-grid">
            <InputReutilisable label="Nom" name="nom" value={profile.nom} onChange={handleChange} required />
            <InputReutilisable label="Prénom" name="prenom" value={profile.prenom} onChange={handleChange} required />
            <InputReutilisable label="Email" name="email" type="email" value={profile.email} onChange={handleChange} required />
            <InputReutilisable label="Téléphone" name="telephone" value={profile.telephone} onChange={handleChange} />
            <InputReutilisable label="Nouveau mot de passe" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <p className="profile-password-note">Le changement de mot de passe n’est pas encore exposé par l’API actuelle.</p>
          {(error || message) && <p className={error ? 'profile-error' : 'profile-success'}>{error || message}</p>}
          <div className="profile-modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Annuler</button><button type="submit" className="primary-button" disabled={isLoading}>{isLoading ? 'Enregistrement...' : 'Enregistrer'}</button></div>
        </form>}
    </Modal>
  )
}

export default ProfileModal
