import { useMemo, useState, useEffect } from 'react'
import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import SearchFilterBar from '../../components/form/Filter'
import Avatar from '../../components/avatar/Avatar'
import { useEtudiant } from '../../hooks/useEtudiant'
import { useFormation } from '../../hooks/useFormation'
import './Etudiants.css'

// Liste des étudiants avec recherche et filtre par statut.
// Super Admin / Accueil : tous les étudiants ; Formateur : seulement ceux de ses formations.
// Seul le Super Admin voit les boutons Créer / Modifier / Supprimer.
function Etudiants({ user, onCreate, onDetail, onEdit }) {
  const { etudiants, isLoading: studentsLoading, error: studentsError, deleteEtudiant } = useEtudiant()
  const { formations, isLoading: formationsLoading, getEtudiants } = useFormation()

  const [formateurStudents, setFormateurStudents] = useState([])
  const [formateurLoading, setFormateurLoading] = useState(false)
  const [formateurError, setFormateurError] = useState('')

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Tous')
  const [actionError, setActionError] = useState('')

  const userId = user?.id_utilisateur || user?.id
  const isFormateur = user?.role === 'Formateur'
  const canManage = user?.role === 'Super Admin'

  // ---- Charger les étudiants du formateur (une formation à la fois) ----
  useEffect(() => {
    if (!isFormateur) return

    const mesFormations = formations.filter(
      (f) => Number(f.id_utilisateur) === Number(userId)
    )

    if (mesFormations.length === 0) {
      setFormateurStudents([])
      return
    }

    let annule = false

    async function chargerEtudiants() {
      setFormateurLoading(true)
      setFormateurError('')

      // Un étudiant inscrit à plusieurs formations du formateur n'est ajouté qu'une fois
      const etudiantsVus = new Set()
      const tousLesEtudiants = []

      try {
        for (const formation of mesFormations) {
          const liste = await getEtudiants(formation.id_formation)

          for (const etudiant of liste || []) {
            if (!etudiantsVus.has(etudiant.id_etudiant)) {
              etudiantsVus.add(etudiant.id_etudiant)
              tousLesEtudiants.push(etudiant)
            }
          }
        }

        if (!annule) setFormateurStudents(tousLesEtudiants)
      } catch (err) {
        if (!annule) setFormateurError(err.message || 'Impossible de charger vos étudiants.')
      } finally {
        if (!annule) setFormateurLoading(false)
      }
    }

    chargerEtudiants()

    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormateur, formations.length, userId])

  // ---- Choix de la source de données selon le rôle ----
  let sourceStudents, isLoading, error

  if (isFormateur) {
    sourceStudents = formateurStudents
    isLoading = formationsLoading || formateurLoading
    error = formateurError
  } else {
    sourceStudents = etudiants
    isLoading = studentsLoading
    error = studentsError
  }

  // ---- Filtrage ----
  // useMemo : le filtre n'est recalculé que si la liste, la recherche ou le statut changent
  const filteredStudents = useMemo(() => {
    const texteRecherche = search.trim().toLowerCase()

    function correspond(student) {
      const texteComplet = [student.nom, student.prenom, student.email, student.telephone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const okRecherche = texteComplet.includes(texteRecherche)

      let okStatut = true
      if (status === 'Actif') okStatut = student.etat === true
      if (status === 'Inactif') okStatut = student.etat === false

      return okRecherche && okStatut
    }

    return sourceStudents.filter(correspond)
  }, [sourceStudents, search, status])

  function handleReset() {
    setSearch('')
    setStatus('Tous')
  }

  async function handleDelete(student) {
    const confirmation = window.confirm(`Supprimer ${student.prenom} ${student.nom} ?`)
    if (!confirmation) return

    try {
      setActionError('')
      await deleteEtudiant(student.id_etudiant)
    } catch (err) {
      setActionError(err.message)
    }
  }

  // ---- Rendu des cellules du tableau ----
  function renderNom(student) {
    return (
      <div className="student-name">
        <Avatar photo={student.photo} prenom={student.prenom} nom={student.nom} />
        <strong>{student.prenom} {student.nom}</strong>
      </div>
    )
  }

  function renderStatut(student) {
    const classe = student.etat ? 'actif' : 'inactif'
    const texte = student.etat ? 'Actif' : 'Inactif'
    return <span className={`student-status ${classe}`}>{texte}</span>
  }

  function renderActions(student) {
    return (
      <div className="table-actions">
        {/* ✅ Callback au lieu de navigate() */}
        <button
          type="button"
          className="row-action"
          onClick={() => onDetail && onDetail(student.id_etudiant)}
        >
          Détail
        </button>

        {canManage && (
          <>
            <button
              type="button"
              className="row-action"
              onClick={() => onEdit && onEdit(student.id_etudiant)}
            >
              Modifier
            </button>
            <button
              type="button"
              className="row-action danger-action"
              onClick={() => handleDelete(student)}
            >
              Supprimer
            </button>
          </>
        )}
      </div>
    )
  }

  const columns = [
    { key: 'name', header: 'Etudiant', render: renderNom },
    { key: 'email', header: 'Email' },
    { key: 'telephone', header: 'Téléphone' },
    { key: 'etat', header: 'Statut', render: renderStatut },
    { key: 'actions', header: 'Actions', render: renderActions },
  ]

  const titre = isFormateur ? 'Mes étudiants' : 'Etudiants'
  const sousTitre = isFormateur
    ? `${sourceStudents.length} étudiant(s) dans vos formations`
    : `${etudiants.length} étudiants enregistrés`

  const messageVide = isFormateur
    ? 'Aucun étudiant dans vos formations.'
    : 'Aucun étudiant trouvé.'

  return (
    <section className="students-main">
      <Header user={user} activeItem="Etudiants" />

      <div className="students-heading">
        <div>
          <h1>{titre}</h1>
          <p>{sousTitre}</p>
        </div>

        {canManage && (
          <button
            type="button"
            className="primary-button"
            /* ✅ Callback au lieu de navigate() */
            onClick={() => onCreate && onCreate()}
          >
            <span aria-hidden="true">+</span> Nouvel étudiant
          </button>
        )}
      </div>

      <article className="students-panel">
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher un étudiant..."
          filters={[
            {
              name: 'status',
              label: 'Statut',
              value: status,
              onChange: setStatus,
              options: ['Tous', 'Actif', 'Inactif'],
            },
          ]}
          onReset={handleReset}
        />

        {(error || actionError) && <p className="form-error">{error || actionError}</p>}

        {isLoading ? (
          <p className="students-loading">Chargement des étudiants...</p>
        ) : (
          <Tableau
            columns={columns}
            rows={filteredStudents}
            rowKey="id_etudiant"
            emptyMessage={messageVide}
            wrapperClassName="students-table-wrap"
            className="students-table"
          />
        )}

        <footer className="students-footer">
          <span>
            Affichage <strong>{filteredStudents.length}</strong> sur{' '}
            <strong>{sourceStudents.length}</strong>
          </span>
        </footer>
      </article>
    </section>
  )
}

export default Etudiants