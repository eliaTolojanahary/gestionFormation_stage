import { useRef, useState } from 'react'
import Icon from '../../components/icon/Icon'
import { apiRequest } from '../../utils/api'
import { getFileUrl } from '../../utils/files'

// Ligne de réglage d'une image enregistrée sur le serveur (Super Admin) : aperçu, « Remplacer »
// (PUT multipart, champ "image") et « Par défaut » (DELETE). Sert au fond de la vitrine mobile
// et au logo de l'organisation.
//   chemin        : image actuelle ("vitrine/xxx.jpg"), null = image par défaut
//   route         : adresse de l'API, ex. "/vitrine/fond"
//   onChange      : appelé avec le nouveau chemin (null après « Par défaut »)
function ImageParametre({ titre, aide, chemin, imageParDefaut, route, onChange, onSaved, apercuClassName = '' }) {
  const inputRef = useRef(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  async function envoyer(action) {
    setEnCours(true)
    setErreur('')
    try {
      await action()
      onSaved()
    } catch (err) {
      setErreur(err.message || "Impossible d'enregistrer l'image.")
    } finally {
      setEnCours(false)
    }
  }

  function handleFichier(event) {
    const fichier = event.target.files?.[0]
    event.target.value = '' // permet de rechoisir le même fichier
    if (!fichier) return

    envoyer(async () => {
      const formData = new FormData()
      formData.append('image', fichier)
      const result = await apiRequest(route, { method: 'PUT', body: formData })
      await onChange(result.fond || result.logo || null)
    })
  }

  function handleParDefaut() {
    envoyer(async () => {
      await apiRequest(route, { method: 'DELETE' })
      await onChange(null)
    })
  }

  return (
    <div className="setting-line logo-setting">
      <div>
        <strong>{titre}</strong>
        <small>{aide}</small>
        {erreur && <div className="form-message error" role="alert" style={{ marginTop: '8px' }}>{erreur}</div>}
      </div>
      <div className="logo-control">
        <img className={apercuClassName} src={chemin ? getFileUrl(chemin) : imageParDefaut} alt={`${titre} : image actuelle`} />
        <button
          className="secondary-button"
          type="button"
          disabled={enCours}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="upload" /> {enCours ? 'Envoi…' : 'Remplacer'}
        </button>
        {chemin && (
          <button className="secondary-button" type="button" disabled={enCours} onClick={handleParDefaut}>
            Par défaut
          </button>
        )}
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFichier}
        />
      </div>
    </div>
  )
}

export default ImageParametre
