import { useEffect } from 'react'

/**
 * Composant de prévisualisation d'image en plein écran
 * @param {Object} props
 * @param {string} props.src - URL de l'image
 * @param {string} [props.alt] - Texte alternatif
 * @param {function} props.onClose - Fonction de fermeture
 */
export default function ImageLightbox({ src, alt = 'Aperçu image', onClose }) {
  useEffect(() => {
    if (!src) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [src, onClose])

  if (!src) return null

  function handleBackgroundClick(event) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="image-lightbox-overlay"
      onClick={handleBackgroundClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        cursor: 'pointer',
        padding: '20px'
      }}
    >
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-15px',
            right: '-15px',
            background: '#ffffff',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: '100%',
            maxHeight: '85vh',
            borderRadius: '8px',
            objectFit: 'contain',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            cursor: 'default'
          }}
          onClick={(e) => e.stopPropagation()} // Évite de fermer quand on clique sur l'image elle-même
        />
      </div>
    </div>
  )
}