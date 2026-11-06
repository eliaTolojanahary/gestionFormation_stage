import { useCallback, useRef, useState } from 'react'
import Icon from '../icon/Icon'
import Modal from '../modal/Modal'
import { RetourContext } from './useRetour'
import './Retour.css'

// Retours à l'utilisateur, utilisables depuis n'importe quelle page :
// - confirmer({ titre, message, bouton, danger }) : fenêtre de confirmation (remplace window.confirm),
//   renvoie une promesse true / false ;
// - notifier('Étudiant enregistré') : petit message de réussite en bas de l'écran, qui disparaît seul ;
//   notifier('Étudiant désactivé', { annuler }) ajoute un bouton « Annuler » qui appelle annuler()
//   (ex. réactiver ce qu'on vient de désactiver), affiché un peu plus longtemps.
const DUREE_MESSAGE = 3500 // ms
const DUREE_AVEC_ANNULER = 7000 // ms

export function RetourProvider({ children }) {
  const [demande, setDemande] = useState(null) // confirmation en cours (+ sa fonction resolve)
  const [message, setMessage] = useState(null) // { texte, annuler? }
  const minuteur = useRef(null)

  const confirmer = useCallback((options) => new Promise((resolve) => {
    setDemande({ ...options, resolve })
  }), [])

  const notifier = useCallback((texte, { annuler } = {}) => {
    clearTimeout(minuteur.current)
    setMessage({ texte, annuler })
    minuteur.current = setTimeout(() => setMessage(null), annuler ? DUREE_AVEC_ANNULER : DUREE_MESSAGE)
  }, [])

  async function annulerAction() {
    const { annuler } = message
    clearTimeout(minuteur.current)
    setMessage(null)
    await annuler()
  }

  function repondre(reponse) {
    demande?.resolve(reponse)
    setDemande(null)
  }

  return (
    <RetourContext.Provider value={{ confirmer, notifier }}>
      {children}

      {demande && (
        <Modal
          eyebrow="Confirmation"
          title={demande.titre || 'Confirmer'}
          titleId="confirmation-title"
          onClose={() => repondre(false)}
          actions={(
            <>
              <button type="button" className="secondary-button" onClick={() => repondre(false)}>
                Annuler
              </button>
              <button
                type="button"
                className={`primary-button ${demande.danger ? 'confirmation-danger' : ''}`}
                onClick={() => repondre(true)}
                autoFocus
              >
                {demande.bouton || 'Confirmer'}
              </button>
            </>
          )}
        >
          <p className="confirmation-message">{demande.message}</p>
        </Modal>
      )}

      {message && (
        <div className="retour-succes" role="status">
          <Icon name="check" className="icon-inline" /> {message.texte}
          {message.annuler && (
            <button type="button" className="retour-annuler" onClick={annulerAction}>
              Annuler
            </button>
          )}
        </div>
      )}
    </RetourContext.Provider>
  )
}
