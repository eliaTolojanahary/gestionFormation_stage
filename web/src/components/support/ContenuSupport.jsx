import Icon from '../icon/Icon'
import { getFileUrl } from '../../utils/files'
import { typeFichier } from '../../utils/texteRiche'
import '../editeur/TexteRiche.css'
import './ContenuSupport.css'

// Bloque le menu clic droit (« Enregistrer la vidéo sous… ») sur les lecteurs
const sansMenu = (event) => event.preventDefault()

// Pièce jointe d'un support : lecteur intégré pour l'audio et la vidéo, lien d'ouverture sinon
function PieceJointe({ fichier }) {
  const url = getFileUrl(fichier)
  const type = typeFichier(fichier)

  if (type === 'video') {
    return (
      <video
        className="support-media support-video"
        src={url}
        controls
        preload="metadata"
        controlsList="nodownload"
        disablePictureInPicture
        onContextMenu={sansMenu}
      >
        Votre navigateur ne peut pas lire cette vidéo.
      </video>
    )
  }

  if (type === 'audio') {
    return (
      <audio
        className="support-media support-audio"
        src={url}
        controls
        preload="metadata"
        controlsList="nodownload"
        onContextMenu={sansMenu}
      >
        Votre navigateur ne peut pas lire cet audio.
      </audio>
    )
  }

  return (
    <a className="support-card-file" href={url} target="_blank" rel="noreferrer">
      <Icon name="file" />
      <span>{type === 'image' ? "Ouvrir l'image" : 'Ouvrir le support'}</span>
    </a>
  )
}

// Contenu d'un support : texte mis en forme puis pièce jointe éventuelle.
// Le HTML vient de l'API, qui l'a nettoyé à l'enregistrement (balises autorisées seulement,
// voir backend utils/contenuRiche.js) : il peut être injecté tel quel.
function ContenuSupport({ support }) {
  return (
    <>
      {support.contenu && (
        <div className="texte-riche support-texte" dangerouslySetInnerHTML={{ __html: support.contenu }} />
      )}
      {support.fichier && <PieceJointe fichier={support.fichier} />}
    </>
  )
}

export default ContenuSupport
