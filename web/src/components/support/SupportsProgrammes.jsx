import { useState } from 'react'
import EditeurTexte from '../editeur/EditeurTexte'
import { useSupport } from '../../hooks/useSupport'
import { formatDateHeureLocale, toDatetimeLocal } from '../../utils/time'
import { ACCEPT_SUPPORT, typeFichier } from '../../utils/texteRiche'
import './SupportsProgrammes.css'

// Ex. « texte + vidéo », « PDF », « texte »
const LIBELLES_FICHIER = { pdf: 'PDF', image: 'image', audio: 'audio', video: 'vidéo', autre: 'fichier' }
function resumeContenu(support) {
  const parties = []
  if (support.contenu) parties.push('texte')
  if (support.fichier) parties.push(LIBELLES_FICHIER[typeFichier(support.fichier)])
  return parties.join(' + ')
}

// Un support programmé : affichage, ou formulaire de modification (titre, texte, heure, fichier)
function LigneProgramme({ support, onChange }) {
  const { updateSupportProgramme, envoyerSupport, deleteSupport, isLoading } = useSupport()
  const [enEdition, setEnEdition] = useState(false)
  const [titre, setTitre] = useState(support.titre)
  const [contenu, setContenu] = useState(support.contenu || '')
  const [dateEnvoi, setDateEnvoi] = useState(toDatetimeLocal(support.date_envoi_prevue))
  const [fichier, setFichier] = useState(null)
  const [erreur, setErreur] = useState('')

  async function executer(action) {
    setErreur('')
    try {
      await action()
      await onChange()
    } catch (requestError) {
      setErreur(requestError.message)
    }
  }

  function enregistrer(event) {
    event.preventDefault()
    const formData = new FormData()
    formData.append('titre', titre)
    // Toujours envoyé : un texte vidé est supprimé (refusé par l'API si le support n'a pas de fichier)
    formData.append('contenu', contenu)
    // Heure locale du navigateur convertie en ISO : le serveur reçoit l'instant exact
    formData.append('date_envoi_prevue', new Date(dateEnvoi).toISOString())
    if (fichier) formData.append('fichier', fichier)
    executer(async () => {
      await updateSupportProgramme(support.id_support, formData)
      setEnEdition(false)
    })
  }

  function envoyerMaintenant() {
    if (!window.confirm(`Envoyer « ${support.titre} » maintenant aux étudiants ?`)) return
    executer(() => envoyerSupport(support.id_support))
  }

  function supprimer() {
    if (!window.confirm(`Supprimer le support programmé « ${support.titre} » ?`)) return
    executer(() => deleteSupport(support.id_support))
  }

  if (enEdition) {
    return (
      <form className="programme-ligne programme-edition" onSubmit={enregistrer}>
        <input value={titre} onChange={(event) => setTitre(event.target.value)} placeholder="Titre" required />
        <input
          type="datetime-local"
          value={dateEnvoi}
          min={toDatetimeLocal(new Date())}
          onChange={(event) => setDateEnvoi(event.target.value)}
          required
        />
        <EditeurTexte value={contenu} onChange={setContenu} disabled={isLoading} />
        <input
          type="file"
          accept={ACCEPT_SUPPORT}
          onChange={(event) => setFichier(event.target.files?.[0] || null)}
          aria-label="Remplacer le fichier (facultatif)"
        />
        <div className="programme-actions">
          <button type="submit" className="row-action" disabled={isLoading}>Enregistrer</button>
          <button type="button" className="row-action" onClick={() => setEnEdition(false)}>Annuler</button>
        </div>
        {erreur && <small className="form-error">{erreur}</small>}
      </form>
    )
  }

  return (
    <article className="programme-ligne">
      <div>
        <strong>{support.titre}</strong>
        <small>
          {support.nom_formation} · {resumeContenu(support)} · envoi le {formatDateHeureLocale(support.date_envoi_prevue)}
          {support.annonce_envoyee ? ' · étudiants prévenus' : ''}
        </small>
      </div>
      <div className="programme-actions">
        <button type="button" className="row-action" disabled={isLoading} onClick={() => setEnEdition(true)}>
          Modifier
        </button>
        <button type="button" className="row-action" disabled={isLoading} onClick={envoyerMaintenant}>
          Envoyer maintenant
        </button>
        <button type="button" className="row-action" disabled={isLoading} onClick={supprimer}>
          Supprimer
        </button>
      </div>
      {erreur && <small className="form-error">{erreur}</small>}
    </article>
  )
}

// Brouillons programmés du formateur : modifiables jusqu'à l'heure d'envoi, puis publiés automatiquement
function SupportsProgrammes({ supports, onChange }) {
  return (
    <div className="workspace-panel">
      <div className="panel-heading">
        <div>
          <h2>Supports programmés</h2>
          <p>
            Invisibles pour les étudiants jusqu'à l'heure d'envoi. Ils sont prévenus une heure avant,
            puis le support est envoyé automatiquement.
          </p>
        </div>
      </div>
      {supports.length === 0 ? (
        <p className="muted-text">Aucun support programmé.</p>
      ) : (
        <div className="programme-liste">
          {supports.map((support) => (
            // La clé inclut l'heure : la ligne est réinitialisée après une modification
            <LigneProgramme
              key={`${support.id_support}-${support.date_envoi_prevue}-${support.titre}`}
              support={support}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default SupportsProgrammes
