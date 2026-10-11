import { useMemo, useState } from 'react'
import Icon from '../../components/icon/Icon'
import Header from '../../components/header/Header'
import { useAssistance, STATUTS_ASSISTANCE } from '../../hooks/useAssistance'
import { formatDate } from '../../utils/time'
import './Assistance.css'

const FILTRES = [
  { valeur: STATUTS_ASSISTANCE.EN_ATTENTE, label: 'En attente' },
  { valeur: STATUTS_ASSISTANCE.RESOLU, label: 'Résolues' },
  { valeur: 'Toutes', label: 'Toutes' },
]

// Badge du statut de la demande
function StatutDemande({ statut }) {
  const resolu = statut === STATUTS_ASSISTANCE.RESOLU
  return <span className={`status-pill ${resolu ? 'resolu' : ''}`}>{statut}</span>
}

// Demandes envoyées par les étudiants depuis l'application mobile ;
// l'Accueil / le Super Admin les traitent puis cliquent « Résoudre ».
function Assistance({ user }) {
  const { demandes, isLoading, error, resoudreDemande } = useAssistance()
  const [filtre, setFiltre] = useState(STATUTS_ASSISTANCE.EN_ATTENTE)
  const [idSelection, setIdSelection] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [actionError, setActionError] = useState('')

  const nbEnAttente = demandes.filter((d) => d.statut === STATUTS_ASSISTANCE.EN_ATTENTE).length

  const demandesFiltrees = useMemo(
    () => (filtre === 'Toutes' ? demandes : demandes.filter((d) => d.statut === filtre)),
    [demandes, filtre]
  )

  // Demande affichée à droite : celle cliquée, sinon la première de la liste filtrée
  const selection =
    demandes.find((d) => d.id_assistance === idSelection) || demandesFiltrees[0] || null

  async function handleResoudre() {
    if (!selection) return
    setActionError('')
    setEnCours(true)
    try {
      await resoudreDemande(selection.id_assistance)
    } catch (requestError) {
      setActionError(requestError.message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <section className="workspace-page">
      <Header user={user} activeItem="Assistance" />

      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Centre d'aide</span>
          <h1>Assistance</h1>
          <p>Demandes envoyées par les étudiants depuis l'application mobile.</p>
        </div>
        <div className="support-contact">
          <Icon name="help" />
          <span>
            <strong>{nbEnAttente} demande{nbEnAttente > 1 ? 's' : ''} en attente</strong>
            <small>Résolvez-les pour prévenir l'étudiant</small>
          </span>
        </div>
      </div>

      {(error || actionError) && <p className="form-error">{error || actionError}</p>}

      <div className="support-layout assistance-layout">
        <div className="workspace-panel">
          <div className="panel-heading">
            <div>
              <h2>Demandes</h2>
              <p>Cliquez sur une demande pour la consulter.</p>
            </div>
            <span className="count-badge">{demandesFiltrees.length}</span>
          </div>

          <div className="assistance-filtres">
            {FILTRES.map(({ valeur, label }) => (
              <button
                key={valeur}
                type="button"
                className={`assistance-filtre ${filtre === valeur ? 'actif' : ''}`}
                onClick={() => { setFiltre(valeur); setIdSelection(null) }}
              >
                {label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="muted-text">Chargement...</p>
          ) : demandesFiltrees.length === 0 ? (
            <p className="muted-text">Aucune demande.</p>
          ) : (
            <div className="ticket-list">
              {demandesFiltrees.map((d) => (
                <button
                  type="button"
                  key={d.id_assistance}
                  className={`ticket-row ticket-row-bouton ${selection?.id_assistance === d.id_assistance ? 'selectionne' : ''}`}
                  onClick={() => setIdSelection(d.id_assistance)}
                >
                  <span className="ticket-id">#{d.id_assistance}</span>
                  <div>
                    <strong>{d.objet}</strong>
                    <small>{d.etudiant_prenom} {d.etudiant_nom} · {formatDate(d.date_envoi)}</small>
                  </div>
                  <StatutDemande statut={d.statut} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="workspace-panel assistance-detail">
          {!selection ? (
            <p className="muted-text">Sélectionnez une demande.</p>
          ) : (
            <>
              <div className="panel-heading">
                <div>
                  <h2>{selection.objet}</h2>
                  <p>
                    {selection.etudiant_prenom} {selection.etudiant_nom} · {selection.etudiant_email}
                  </p>
                </div>
                <StatutDemande statut={selection.statut} />
              </div>

              <p className="assistance-date">Envoyée le {formatDate(selection.date_envoi)}</p>
              <p className="assistance-message">{selection.contenu}</p>

              {selection.statut === STATUTS_ASSISTANCE.RESOLU ? (
                <p className="success-message">
                  Résolue le {formatDate(selection.date_resolution)}
                  {selection.resolu_par_prenom && ` par ${selection.resolu_par_prenom} ${selection.resolu_par_nom}`}.
                </p>
              ) : (
                <button className="primary-button" type="button" onClick={handleResoudre} disabled={enCours}>
                  <Icon name="send" /> {enCours ? 'Résolution...' : 'Résoudre'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default Assistance
