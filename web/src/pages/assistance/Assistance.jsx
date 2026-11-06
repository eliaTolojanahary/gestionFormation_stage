import { useState } from 'react'
import Icon from '../../components/icon/Icon'
import Header from '../../components/header/Header'
import { useAssistance, STATUTS_ASSISTANCE } from '../../hooks/useAssistance'
import { useListePaginee } from '../../hooks/useListePaginee'
import Pagination from '../../components/pagination/Pagination'
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
// Statut, recherche et pagination faits par le serveur (GET /assistances?page=&statut=&recherche=).
function Assistance({ user }) {
  const { resoudreDemande } = useAssistance({ charger: false })
  const [filtre, setFiltre] = useState(STATUTS_ASSISTANCE.EN_ATTENTE)
  const [recherche, setRecherche] = useState('')
  const [idSelection, setIdSelection] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [actionError, setActionError] = useState('')

  const liste = useListePaginee('/assistances', {
    statut: filtre === 'Toutes' ? '' : filtre,
    recherche: recherche.trim(),
  })
  const { lignes: demandesFiltrees, isLoading, error } = liste
  // Nombre de demandes en attente, toutes pages confondues (renvoyé par le serveur)
  const nbEnAttente = liste.extra.compteurs?.en_attente ?? 0

  // Demande affichée à droite : celle cliquée, sinon la première de la page
  const selection =
    demandesFiltrees.find((d) => d.id_assistance === idSelection) || demandesFiltrees[0] || null

  async function handleResoudre() {
    if (!selection) return
    setActionError('')
    setEnCours(true)
    try {
      const resolue = await resoudreDemande(selection.id_assistance)
      // Mise à jour tout de suite, puis rechargement (compteur, filtre « En attente »)
      liste.setLignes((lignes) => lignes.map((d) => (d.id_assistance === resolue.id_assistance ? resolue : d)))
      liste.recharger()
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
            <span className="count-badge">{liste.total}</span>
          </div>

          <input
            type="search"
            className="assistance-recherche"
            value={recherche}
            onChange={(event) => { setRecherche(event.target.value); setIdSelection(null) }}
            placeholder="Rechercher un objet, un message, un étudiant…"
            aria-label="Rechercher une demande"
          />

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

          <Pagination
            page={liste.page}
            pages={liste.pages}
            total={liste.total}
            limite={liste.limite}
            onChange={(page) => { liste.setPage(page); setIdSelection(null) }}
            libelle="demande(s)"
          />
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
