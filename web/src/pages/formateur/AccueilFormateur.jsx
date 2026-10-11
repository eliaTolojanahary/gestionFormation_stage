import { useEffect, useState } from 'react'
import Header from '../../components/header/Header'
import Modal from '../../components/modal/Modal'
import Avatar from '../../components/avatar/Avatar'
import ClassementFormation from '../../components/classement/ClassementFormation'
import { useFormation } from '../../hooks/useFormation'
import { formatDate } from '../../utils/time'
import './AccueilFormateur.css'

// Étudiants d'une formation, en fenêtre ; recherche par nom ou e-mail au-delà de 5 étudiants
function EtudiantsFormationModal({ formation, etudiants, onClose }) {
  const [recherche, setRecherche] = useState('')
  const filtre = recherche.trim().toLowerCase()
  const visibles = etudiants.filter((etudiant) =>
    `${etudiant.prenom} ${etudiant.nom} ${etudiant.email}`.toLowerCase().includes(filtre)
  )

  return (
    <Modal
      eyebrow={`${etudiants.length} étudiant(s) inscrit(s)`}
      title={formation.nom}
      titleId="etudiants-formation-titre"
      onClose={onClose}
    >
      {etudiants.length === 0 ? (
        <p className="muted-text">Aucun étudiant inscrit pour le moment.</p>
      ) : (
        <>
          {etudiants.length > 5 && (
            <input
              className="etudiants-recherche"
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un étudiant…"
              aria-label="Rechercher un étudiant"
            />
          )}
          <ul className="etudiants-modal-liste">
            {visibles.map((etudiant) => (
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
            {visibles.length === 0 && <li className="muted-text">Aucun étudiant ne correspond.</li>}
          </ul>
        </>
      )}
    </Modal>
  )
}

// Espace formateur : ses formations (un clic ouvre la liste des étudiants) et le classement /
// notes d'attestation. Les supports ont leurs pages : « Supports » et « Supports programmés ».
function AccueilFormateur({ user }) {
  const { formations, isLoading, error, getEtudiants } = useFormation()

  const [studentsByFormation, setStudentsByFormation] = useState({})
  // Formation dont on affiche les étudiants en fenêtre
  const [formationOuverte, setFormationOuverte] = useState(null)

  const userId = user?.id_utilisateur || user?.id
  const ownFormations = formations.filter(
    (formation) => Number(formation.id_utilisateur) === Number(userId)
  )

  // Charge les étudiants de chaque formation du formateur
  useEffect(() => {
    if (!ownFormations.length) return

    let cancelled = false

    async function loadEtudiants() {
      const studentGroups = await Promise.all(
        ownFormations.map(async (formation) => [
          formation.id_formation,
          await getEtudiants(formation.id_formation),
        ])
      )
      if (!cancelled) setStudentsByFormation(Object.fromEntries(studentGroups))
    }

    loadEtudiants()

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
              const etudiants = studentsByFormation[formation.id_formation]
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
                      {etudiants ? `${etudiants.length} étudiant(s)` : 'Chargement…'}
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
          etudiants={studentsByFormation[formationOuverte.id_formation] || []}
          onClose={() => setFormationOuverte(null)}
        />
      )}

      {ownFormations.length > 0 && <ClassementFormation formations={ownFormations} />}

    </section>
  )
}

export default AccueilFormateur
