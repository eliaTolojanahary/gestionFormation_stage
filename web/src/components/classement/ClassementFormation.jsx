import { useEffect, useState } from 'react'
import { useClassement } from '../../hooks/useClassement'
import './ClassementFormation.css'

// Le formateur note la présentation sur 10 ; les 10 autres points sont calculés par le système
const NOTE_PRESENTATION_MAX = 10
const POINTS_MAX = 5

function formatNote(note) {
  return note === null || note === undefined ? '—' : Number(note).toLocaleString('fr-FR')
}

// Une ligne du classement : rang, présence, paiement, note système, saisie de la présentation et note finale.
function LigneClassement({ etudiant, onEnregistrer }) {
  const noteActuelle = etudiant.note_presentation ?? ''
  const [saisie, setSaisie] = useState(noteActuelle === '' ? '' : String(noteActuelle))
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  // Le bouton Enregistrer n'est actif que si la saisie diffère de la note enregistrée
  const modifiee = saisie.trim() !== (noteActuelle === '' ? '' : String(noteActuelle))

  // valeur '' = effacer la note de présentation
  async function enregistrer(valeur) {
    setErreur('')
    if (valeur !== '' && Number(valeur.replace(',', '.')) > NOTE_PRESENTATION_MAX) {
      setErreur(`Vous devez attribuer une note de ${NOTE_PRESENTATION_MAX} au maximum.`)
      return
    }
    setEnCours(true)
    try {
      await onEnregistrer(etudiant.id_inscription, valeur)
      setSaisie(valeur)
    } catch (requestError) {
      setErreur(requestError.message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <tr>
      <td className="classement-rang">{etudiant.rang}</td>
      <td>
        <strong>{etudiant.prenom} {etudiant.nom}</strong>
        <small>
          {etudiant.nb_presences} jour(s) présent sur {etudiant.jours_requis} jours de cours
        </small>
      </td>
      <td>
        <div className="classement-criteres">
          <span className={`classement-critere ${etudiant.paiement_regulier ? 'atteint' : ''}`}>
            Paiement {etudiant.paiement_regulier ? 'régulier' : 'en retard'} : {etudiant.points_paiement}/{POINTS_MAX}
          </span>
          <span className={`classement-critere ${etudiant.points_presence === POINTS_MAX ? 'atteint' : ''}`}>
            Présence : {etudiant.points_presence}/{POINTS_MAX}
          </span>
        </div>
      </td>
      <td className="classement-note-suggeree">{formatNote(etudiant.note_suggeree)} / 10</td>
      <td>
        <div className="classement-saisie">
          <input
            type="number"
            min="0"
            max={NOTE_PRESENTATION_MAX}
            step="0.25"
            value={saisie}
            placeholder="/ 10"
            onChange={(event) => setSaisie(event.target.value)}
            aria-label={`Note de présentation de ${etudiant.prenom} ${etudiant.nom}`}
          />
          <button
            type="button"
            className="row-action"
            disabled={!modifiee || enCours}
            onClick={() => enregistrer(saisie.trim())}
          >
            {enCours ? '...' : 'Enregistrer'}
          </button>
          {etudiant.note_presentation !== null && etudiant.note_presentation !== undefined && (
            <button
              type="button"
              className="row-action"
              disabled={enCours}
              onClick={() => enregistrer('')}
              title="Effacer la note de présentation"
            >
              Effacer
            </button>
          )}
        </div>
        {erreur && <small className="classement-erreur">{erreur}</small>}
      </td>
      <td className="classement-note-suggeree">
        {etudiant.note_finale === null ? <small>à noter</small> : `${formatNote(etudiant.note_finale)} / 20`}
      </td>
    </tr>
  )
}

// Classe les étudiants selon leur paiement et leur présence sur l'application mobile (note système sur 10).
// Le formateur complète avec la note de présentation sur 10 : la note d'attestation est sur 20.
function ClassementFormation({ formations }) {
  const { classement, isLoading, error, getClassement, definirNote } = useClassement()
  const [idFormation, setIdFormation] = useState('')

  // Par défaut, la première formation de la liste est sélectionnée
  const formationActive = idFormation || formations[0]?.id_formation || ''

  useEffect(() => {
    getClassement(formationActive)
  }, [formationActive, getClassement])

  return (
    <div className="workspace-panel classement-panel">
      <div className="panel-heading">
        <div>
          <h2>Classement et notes d'attestation</h2>
          <p>
            Note sur 20. Le système calcule 10 points : paiement (5 si régulier, sinon 2) et présence
            sur l'application (2 sous la moitié des jours de cours, 3 à partir de la moitié, 5 si présent
            jusqu'à 2 semaines avant la fin). Vous attribuez les 10 autres points selon la présentation.
          </p>
        </div>
        <select value={formationActive} onChange={(event) => setIdFormation(event.target.value)}>
          {formations.map((formation) => (
            <option key={formation.id_formation} value={formation.id_formation}>
              {formation.nom}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <p className="muted-text">Calcul du classement...</p>
      ) : classement.length === 0 ? (
        <p className="muted-text">Aucun étudiant inscrit à cette formation.</p>
      ) : (
        <div className="gestion-table-wrap">
          <table className="gestion-table classement-table">
            <thead>
              <tr>
                <th>Rang</th>
                <th>Étudiant</th>
                <th>Critères</th>
                <th>Système</th>
                <th>Présentation</th>
                <th>Note finale</th>
              </tr>
            </thead>
            <tbody>
              {classement.map((etudiant) => (
                // La clé inclut la note : la ligne est recréée (saisie réinitialisée) quand la note change
                <LigneClassement
                  key={`${etudiant.id_inscription}-${etudiant.note_presentation ?? ''}`}
                  etudiant={etudiant}
                  onEnregistrer={definirNote}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ClassementFormation
