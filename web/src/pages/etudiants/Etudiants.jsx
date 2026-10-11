import { useMemo, useState, useEffect } from 'react'
import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import SearchFilterBar from '../../components/form/Filter'
import Pagination from '../../components/pagination/Pagination'
import Avatar from '../../components/avatar/Avatar'
import { useEtudiant } from '../../hooks/useEtudiant'
import { useFormation } from '../../hooks/useFormation'
import { useListePaginee } from '../../hooks/useListePaginee'
import './Etudiants.css'

const PAR_PAGE = 20

// Liste des étudiants avec recherche (nom, e-mail, téléphone).
// Super Admin / Accueil : tous les étudiants, paginés côté serveur (GET /etudiants?page=) ;
// Formateur : seulement ceux de ses formations (liste courte, paginée dans le navigateur).
// Seul le Super Admin voit les boutons Créer / Modifier / Supprimer.
function Etudiants({ user, onCreate, onDetail, onEdit }) {
  const { deleteEtudiant } = useEtudiant()
  const { formations, isLoading: formationsLoading, getEtudiants } = useFormation()

  const [formateurStudents, setFormateurStudents] = useState([])
  const [formateurLoading, setFormateurLoading] = useState(false)
  const [formateurError, setFormateurError] = useState('')

  const [search, setSearch] = useState('')
  const [pageFormateur, setPageFormateur] = useState(1)
  const [actionError, setActionError] = useState('')

  const userId = user?.id_utilisateur || user?.id
  const isFormateur = user?.role === 'Formateur'
  const canManage = user?.role === 'Super Admin'

  // Personnel : page demandée au serveur. Le formateur ne voit que les étudiants de ses formations,
  // chargés formation par formation ci-dessus : pas de requête paginée (chemin null)
  const liste = useListePaginee(isFormateur ? null : '/etudiants', { recherche: search.trim() })

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

  // ---- Formateur : recherche et pagination dans le navigateur ----
  const etudiantsFormateur = useMemo(() => {
    const texteRecherche = search.trim().toLowerCase()
    return formateurStudents.filter((student) =>
      [student.nom, student.prenom, student.email, student.telephone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(texteRecherche)
    )
  }, [formateurStudents, search])

  // ---- Données affichées selon le rôle ----
  const pagesFormateur = Math.max(1, Math.ceil(etudiantsFormateur.length / PAR_PAGE))
  const pageCourante = isFormateur ? Math.min(pageFormateur, pagesFormateur) : liste.page
  const vue = isFormateur
    ? {
        lignes: etudiantsFormateur.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE),
        total: etudiantsFormateur.length,
        pages: pagesFormateur,
        limite: PAR_PAGE,
        setPage: setPageFormateur,
        isLoading: formationsLoading || formateurLoading,
        error: formateurError,
      }
    : liste

  function changerRecherche(valeur) {
    setSearch(valeur)
    setPageFormateur(1)
  }

  function handleReset() {
    changerRecherche('')
  }

  async function handleDelete(student) {
    const confirmation = window.confirm(`Supprimer ${student.prenom} ${student.nom} ?`)
    if (!confirmation) return

    try {
      setActionError('')
      await deleteEtudiant(student.id_etudiant)
      liste.recharger()
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
    ? `${formateurStudents.length} étudiant(s) dans vos formations`
    : `${vue.total} étudiant(s) correspondant(s)`

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
          onSearchChange={changerRecherche}
          searchPlaceholder="Rechercher un nom, un e-mail, un téléphone..."
          onReset={handleReset}
        />

        {(vue.error || actionError) && <p className="form-error">{vue.error || actionError}</p>}

        {vue.isLoading ? (
          <p className="students-loading">Chargement des étudiants...</p>
        ) : (
          <Tableau
            columns={columns}
            rows={vue.lignes}
            rowKey="id_etudiant"
            emptyMessage={messageVide}
            wrapperClassName="students-table-wrap"
            className="students-table"
          />
        )}

        <Pagination
          page={pageCourante}
          pages={vue.pages}
          total={vue.total}
          limite={vue.limite}
          onChange={vue.setPage}
          libelle="étudiant(s)"
        />
      </article>
    </section>
  )
}

export default Etudiants