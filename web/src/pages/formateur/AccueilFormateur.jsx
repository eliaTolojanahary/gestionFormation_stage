import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../../components/header/Header'
import Modal from '../../components/modal/Modal'
import Avatar from '../../components/avatar/Avatar'
import Pagination from '../../components/pagination/Pagination'
import ClassementFormation from '../../components/classement/ClassementFormation'
import { useFormation } from '../../hooks/useFormation'
import { useListePaginee } from '../../hooks/useListePaginee'
import { apiRequest } from '../../utils/api'
import { formatDate } from '../../utils/time'
import './AccueilFormateur.css'

// Étudiants d'une formation, en fenêtre : 10 par page et recherche (nom, e-mail, téléphone) faites
// par le serveur (GET /formations/:id/etudiants?page=&recherche=)
function EtudiantsFormationModal({ formation, total, onClose }) {
  const [recherche, setRecherche] = useState('')
  const liste = useListePaginee(`/formations/${formation.id_formation}/etudiants`, { recherche: recherche.trim() })
  const nbInscrits = total ?? liste.total // total de la carte, ou celui de la liste s'il n'est pas encore connu

  return (
    <Modal
      eyebrow={`${nbInscrits} étudiant(s) inscrit(s)`}
      title={formation.nom}
      titleId="etudiants-formation-titre"
      onClose={onClose}
    >
      {nbInscrits === 0 && !liste.isLoading ? (
        <p className="muted-text">Aucun étudiant inscrit pour le moment.</p>
      ) : (
        <>
          {nbInscrits > 5 && (
            <input
              className="etudiants-recherche"
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un étudiant…"
              aria-label="Rechercher un étudiant"
            />
          )}
          <ul className="etudiants-modal-liste">
            {liste.lignes.map((etudiant) => (
              <li key={etudiant.id_etudiant}>
                <Avatar photo={etudiant.photo} prenom={etudiant.prenom} nom={etudiant.nom} shape="circle" />
                <div>
                  <strong>{etudiant.prenom} {etudiant.nom}</strong>
                  <small>{etudiant.email}</small>
                </div>
                <small className="etudiant-inscrit-le">
                  Inscrit le {formatDate(etudiant.date_inscription).split(',')[0]}
                </small>
              </li>
            ))}
            {liste.lignes.length === 0 && (
              <li className="muted-text">{liste.isLoading ? 'Chargement…' : 'Aucun étudiant ne correspond.'}</li>
            )}
          </ul>
          <Pagination page={liste.page} pages={liste.pages} total={liste.total} limite={liste.limite} onChange={liste.setPage} libelle="étudiant(s)" />
        </>
      )}
    </Modal>
  )
}

// Espace formateur : ses formations (un clic ouvre la liste des étudiants) et le classement /
// notes d'attestation. Les supports ont leurs pages : « Supports » et « Supports programmés ».
function AccueilFormateur({ user }) {
  const { formations, isLoading, error } = useFormation()

  // Nombre d'inscrits par formation (id_formation -> nombre), affiché sur les cartes
  const [inscritsParFormation, setInscritsParFormation] = useState({})
  // Formation dont on affiche les étudiants en fenêtre
  const [formationOuverte, setFormationOuverte] = useState(null)

  const userId = user?.id_utilisateur || user?.id
  const ownFormations = formations.filter(
    (formation) => Number(formation.id_utilisateur) === Number(userId)
  )

  // Arrivée depuis la recherche globale : ouvre la fenêtre des étudiants de cette formation
  const location = useLocation()
  const idDemande = location.state?.formationOuverte
  const [demandeTraitee, setDemandeTraitee] = useState(null)
  if (idDemande && demandeTraitee !== location.key && ownFormations.length) {
    setDemandeTraitee(location.key)
    setFormationOuverte(ownFormations.find((f) => Number(f.id_formation) === Number(idDemande)) || null)
  }

  // Nombre d'inscrits de chaque formation : une page d'une ligne suffit, le total vient du serveur
  // (les étudiants eux-mêmes ne sont chargés qu'à l'ouverture de la fenêtre)
  useEffect(() => {
    if (!ownFormations.length) return

    let cancelled = false

    async function compterInscrits() {
      const totaux = await Promise.all(
        ownFormations.map(async (formation) => {
          const reponse = await apiRequest(`/formations/${formation.id_formation}/etudiants?page=1&limite=1`)
          return [formation.id_formation, reponse.pagination?.total ?? 0]
        })
      )
      if (!cancelled) setInscritsParFormation(Object.fromEntries(totaux))
    }

    compterInscrits().catch(() => {})

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formations.length, userId])

  return (
    <section className="workspace-page">
      <Header user={user} activeItem="Espace formateur" />

      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Espace formateur</span>
          <h1>Mes formations et notes</h1>
          <p>Retrouvez vos étudiants et attribuez les notes d'attestation.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      <div className="workspace-panel">
        <div className="panel-heading">
          <div>
            <h2>Mes formations</h2>
            <p>{ownFormations.length} formation(s) attribuée(s)</p>
          </div>
        </div>

        {isLoading ? (
          <p>Chargement...</p>
        ) : ownFormations.length === 0 ? (
          <p className="muted-text">Aucune formation ne vous est attribuée.</p>
        ) : (
          <div className="formation-cartes">
            {ownFormations.map((formation) => {
              const inscrits = inscritsParFormation[formation.id_formation]
              return (
                <button
                  type="button"
                  className="formation-carte"
                  key={formation.id_formation}
                  onClick={() => setFormationOuverte(formation)}
                >
                  <strong>{formation.nom}</strong>
                  <span className="formation-carte-description">
                    {formation.description || 'Aucune description.'}
                  </span>
                  <span className="formation-carte-pied">
                    <span className="formation-carte-compte">
                      {inscrits !== undefined ? `${inscrits} étudiant(s)` : 'Chargement…'}
                    </span>
                    <span className="formation-carte-lien">Voir les étudiants →</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {formationOuverte && (
        <EtudiantsFormationModal
          formation={formationOuverte}
          total={inscritsParFormation[formationOuverte.id_formation]}
          onClose={() => setFormationOuverte(null)}
        />
      )}

      {ownFormations.length > 0 && <ClassementFormation formations={ownFormations} />}

    </section>
  )
}

export default AccueilFormateur
