import { useEffect, useState } from 'react'
import { getFileUrl } from '../../utils/files'
import './DocumentAffichage.css'

// Affiche une pièce du dossier (photo, CIN, certificat...) : miniature cliquable pour les images,
// lien de téléchargement pour tous les fichiers, "Non fourni" si aucun chemin.
function DocumentAffichage({ label, path }) {
  const url = getFileUrl(path)
  const isImage = /\.(jpeg|jpg|png|webp|gif)$/i.test(path || '')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Touche Échap pour fermer l'aperçu (écouteur actif seulement quand il est ouvert)
  useEffect(() => {
    if (!isPreviewOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsPreviewOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isPreviewOpen])

  function handleBackgroundClick(event) {
    if (event.target === event.currentTarget) setIsPreviewOpen(false)
  }

  if (!url) {
    return (
      <article className="document-item">
        <span>{label}</span>
        <strong>Non fourni</strong>
      </article>
    )
  }

  return (
    <article className="document-item">
      <span>{label}</span>

      <div className="document-preview-actions">
        {isImage && (
          <button
            type="button"
            className="document-preview-button"
            onClick={() => setIsPreviewOpen(true)}
            aria-label={`Agrandir ${label}`}
          >
            <img className="document-preview" src={url} alt={label} />
          </button>
        )}

        <a href={url} target="_blank" rel="noreferrer" className="document-download" download>
          Télécharger
        </a>
      </div>

      {/* Aperçu en grand ; clic sur le fond pour fermer */}
      {isPreviewOpen && (
        <div className="document-lightbox" role="presentation" onClick={handleBackgroundClick}>
          <div className="document-lightbox-content" role="dialog" aria-modal="true" aria-label={label}>
            <button
              type="button"
              className="document-lightbox-close"
              onClick={() => setIsPreviewOpen(false)}
              aria-label="Fermer l'aperçu"
            >
              ×
            </button>

            <img src={url} alt={label} className="document-large-preview" />

            <a href={url} target="_blank" rel="noreferrer" className="document-download" download>
              Télécharger {label}
            </a>
          </div>
        </div>
      )}
    </article>
  )
}

export default DocumentAffichage