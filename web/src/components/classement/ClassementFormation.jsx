import { useEffect, useState } from 'react'
import Icon from '../icon/Icon'
import Avatar from '../avatar/Avatar'
import { useClassement } from '../../hooks/useClassement'
import './ClassementFormation.css'

// Le formateur note la présentation sur 10 ; les 10 autres points sont calculés par le système
const NOTE_PRESENTATION_MAX = 10

function formatNote(note) {
  return note === null || note === undefined ? '—' : Number(note).toLocaleString('fr-FR')
}

// Couleur de la note finale sur 20 : vert à partir de 14, orange à partir de 10, rouge en dessous
function niveauNote(note) {
  if (note >= 14) return 'bon'
  if (note >= 10) return 'moyen'
  return 'faible'
}

// Points retirés : « 0 » ou « −2 » (vrai signe moins)
const formatMalus = (points) => (points < 0 ? `−${-points}` : '0')

// Détail du paiement : « 1 en retard, 1 non réglée »
function detailPaiement(etudiant) {
  const parties = []
  if (etudiant.nb_payees_en_retard) parties.push(`${etudiant.nb_payees_en_retard} en retard`)
  if (etudiant.nb_non_reglees) parties.push(`${etudiant.nb_non_reglees} non réglée${etudiant.nb_non_reglees > 1 ? 's' : ''}`)
  return parties.join(', ')
}

// Une ligne du classement : rang, étudiant (présence en jours), paiement, présence, note système,
// saisie de la présentation et note finale. Sur petit écran, chaque ligne devient une carte (data-label).
function LigneClassement({ etudiant, onEnregistrer }) {
  const noteActuelle = etudiant.note_presentation ?? ''
  const [saisie, setSaisie] = useState(noteActuelle === '' ? '' : String(noteActuelle))
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  // Le bouton Enregistrer n'est actif que si la saisie diffère de la note enregistrée
  const modifiee = saisie.trim() !== (noteActuelle === '' ? '' : String(noteActuelle))
  const presenceSansMalus = etudiant.points_presence === 0

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
      <td data-label="Rang">
        <span className={`classement-rang ${etudiant.rang <= 3 ? `podium-${etudiant.rang}` : ''}`}>
          {etudiant.rang}
        </span>
      </td>
      <td data-label="Étudiant">
        <div className="classement-etudiant">
          <Avatar photo={etudiant.photo} prenom={etudiant.prenom} nom={etudiant.nom} shape="circle" />
          <div>
            <strong>{etudiant.prenom} {etudiant.nom}</strong>
            <small>{etudiant.nb_presences} / {etudiant.jours_requis} jours de cours</small>
          </div>
        </div>
      </td>
      <td data-label="Paiement">
        <span className={`classement-pastille ${etudiant.paiement_regulier ? 'atteint' : 'manque'}`}>
          <Icon name={etudiant.paiement_regulier ? 'check' : 'x'} className="icon-inline" />{' '}
          {etudiant.paiement_regulier ? 'À temps' : detailPaiement(etudiant)} · {formatMalus(etudiant.points_paiement)}
        </span>
      </td>
      <td data-label="Présence">
        <div className="classement-presence" title={`${etudiant.taux_presence} % des jours de cours`}>
          <span className="classement-barre">
            <span className={presenceSansMalus ? 'atteint' : ''} style={{ width: `${etudiant.taux_presence}%` }} />
          </span>
          <small>{etudiant.taux_presence} % · {formatMalus(etudiant.points_presence)}</small>
        </div>
      </td>
      <td data-label="Système" className="classement-chiffre">
        {formatNote(etudiant.note_suggeree)}<small>/10</small>
      </td>
      <td data-label="Présentation">
        <div className="classement-saisie">
          <input
            type="number"
            min="0"
            max={NOTE_PRESENTATION_MAX}
            step="0.25"
            value={saisie}
            placeholder="—"
            onChange={(event) => setSaisie(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && modifiee && !enCours) enregistrer(saisie.trim())
            }}
            aria-label={`Note de présentation de ${etudiant.prenom} ${etudiant.nom}`}
          />
          <span className="classement-sur">/10</span>
          <button
            type="button"
            className="row-action classement-enregistrer"
            disabled={!modifiee || enCours}
            onClick={() => enregistrer(saisie.trim())}
          >
            {enCours ? '…' : 'Enregistrer'}
          </button>
          {etudiant.note_presentation !== null && etudiant.note_presentation !== undefined && (
            <button
              type="button"
              className="row-action danger-action"
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
      <td data-label="Note finale">
        {etudiant.note_finale === null ? (
          <span className="classement-finale a-noter">À noter</span>
        ) : (
          <span className={`classement-finale ${niveauNote(Number(etudiant.note_finale))}`}>
            {formatNote(etudiant.note_finale)}<small>/20</small>
          </span>
        )}
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

  const nbNotes = classement.filter((etudiant) => etudiant.note_finale !== null).length

  return (
    <div className="workspace-panel classement-panel">
      <div className="panel-heading">
        <div>
          <h2>Classement et notes d'attestation</h2>
          <p>
            Note sur 20. Note système sur 10 : chaque étudiant part de 10 et perd des points.
            Présence sur l'application : 0 à partir de 90 % des jours de cours, −1 à partir de 75 %,
            −2 à partir de 50 %, −4 en dessous. Paiement : −1 par échéance payée en retard (réglée le
            jour suivant), −2 par échéance non réglée (pas réglée le jour suivant), −4 au plus.
            Vous attribuez les 10 autres points selon la présentation.
          </p>
          <p className="muted-text">
            Exemple : présence 80 % (−1) et une échéance payée en retard (−1) donnent 10 − 1 − 1 = 8/10 ;
            avec 7/10 en présentation, la note d'attestation est 15/20.
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
        <>
          {/* Résumé : combien d'étudiants ont déjà leur note d'attestation */}
          <div className="classement-resume">
            <span><strong>{classement.length}</strong> étudiant(s)</span>
            <span><strong>{nbNotes}</strong> noté(s)</span>
            <span className={nbNotes < classement.length ? 'a-noter' : ''}>
              <strong>{classement.length - nbNotes}</strong> à noter
            </span>
          </div>

          <div className="gestion-table-wrap">
            <table className="classement-table">
              <thead>
                <tr>
                  <th>Rang</th>
                  <th>Étudiant</th>
                  <th>Paiement</th>
                  <th>Présence</th>
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
        </>
      )}
    </div>
  )
}

export default ClassementFormation
