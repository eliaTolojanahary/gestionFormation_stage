import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/icon/Icon'
import { apiRequest } from '../../utils/api'
import { getFileUrl } from '../../utils/files'
import fondParDefaut from '../../assets/fond-decouvrir.jpg'

// Ligne « Fond de la vitrine mobile » (Super Admin) : image du bandeau « Découvrir » de
// l'application mobile. Contrairement au logo (gardé dans ce navigateur), le fond est envoyé
// au serveur pour que l'application mobile le voie.
function FondVitrine({ onSaved }) {
  const inputRef = useRef(null)
  const [fond, setFond] = useState(null) // chemin "vitrine/xxx.jpg", null = image par défaut
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    apiRequest('/public/vitrine')
      .then((result) => setFond(result.data?.presentation?.fond || null))
      .catch(() => {})
  }, [])

  async function envoyer(action) {
    setEnCours(true)
    setErreur('')
    try {
      await action()
      onSaved()
    } catch (err) {
      setErreur(err.message || "Impossible d'enregistrer le fond.")
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
      const result = await apiRequest('/vitrine/fond', { method: 'PUT', body: formData })
      setFond(result.fond)
    })
  }

  function handleParDefaut() {
    envoyer(async () => {
      await apiRequest('/vitrine/fond', { method: 'DELETE' })
      setFond(null)
    })
  }

  return (
    <div className="setting-line logo-setting">
      <div>
        <strong>Fond de la vitrine mobile</strong>
        <small>
          Image du bandeau « Découvrir » de l'application. JPG, PNG ou WEBP (8 Mo max),
          de préférence en portrait d'au moins 1200 × 1800 px pour rester nette.
        </small>
        {erreur && <div className="form-message error" role="alert" style={{ marginTop: '8px' }}>{erreur}</div>}
      </div>
      <div className="logo-control">
        <img className="fond-vitrine-apercu" src={fond ? getFileUrl(fond) : fondParDefaut} alt="Fond actuel" />
        <button
          className="secondary-button"
          type="button"
          disabled={enCours}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="upload" /> {enCours ? 'Envoi…' : 'Remplacer'}
        </button>
        {fond && (
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

export default FondVitrine
