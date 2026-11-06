import { useState } from 'react'
import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import SearchFilterBar from '../../components/form/Filter'
import Pagination from '../../components/pagination/Pagination'
import BoutonExportCSV from '../../components/tableau/BoutonExportCSV'
import BarreSelection from '../../components/tableau/BarreSelection'
import Avatar from '../../components/avatar/Avatar'
import { useRetour } from '../../components/retour/useRetour'
import { useEtudiant } from '../../hooks/useEtudiant'
import { useListePaginee } from '../../hooks/useListePaginee'
import { useSelection, useActionsGroupees } from '../../hooks/useSelection'
import { ETATS, ETAT_DEFAUT, filtreEtat } from '../../utils/etat'
import './Etudiants.css'

// Liste des étudiants avec recherche (nom, e-mail, téléphone), paginée côté serveur (GET /etudiants?page=).
// Super Admin / Accueil : tous les étudiants ; Formateur : le serveur ne renvoie que ceux de ses formations.
// Seul le Super Admin voit les boutons Créer / Modifier / Désactiver / Réactiver ;
// le filtre « État » montre les étudiants désactivés (actifs par défaut).
// Super Admin : sélection multiple (clic sur les lignes) pour désactiver ou réactiver en une fois.
function Etudiants({ user, onCreate, onDetail, onEdit }) {
  const { deleteEtudiant, reactiverEtudiant } = useEtudiant()
  const { confirmer, notifier } = useRetour()

  const [search, setSearch] = useState('')
  const [etat, setEtat] = useState(ETAT_DEFAUT)
  const [actionError, setActionError] = useState('')

  const isFormateur = user?.role === 'Formateur'
  const canManage = user?.role === 'Super Admin'

  const liste = useListePaginee('/etudiants', {
    recherche: search.trim(),
    etat: isFormateur ? undefined : ETATS[etat],
  })

  const selection = useSelection(liste.lignes, 'id_etudiant')
  const groupe = useActionsGroupees({ selection, apres: liste.recharger, setErreur: setActionError })
  const actifs = selection.selection.filter((s) => s.etat)
  const inactifs = selection.selection.filter((s) => !s.etat)

  const actionsGroupees = [
    {
      libelle: 'Désactiver',
      danger: true,
      nombre: actifs.length,
      onClick: () => groupe.lancer({
        lignes: actifs,
        confirmation: {
          titre: 'Désactiver les étudiants',
          message: `${actifs.length} étudiant(s) seront désactivés. Vous pourrez les réactiver avec le filtre « Désactivés ».`,
          bouton: 'Désactiver',
          danger: true,
        },
        action: (s) => deleteEtudiant(s.id_etudiant),
        succes: (n) => `${n} étudiant(s) désactivé(s)`,
      }),
    },
    {
      libelle: 'Réactiver',
      succes: true,
      nombre: inactifs.length,
      onClick: () => groupe.lancer({
        lignes: inactifs,
        action: (s) => reactiverEtudiant(s.id_etudiant),
        succes: (n) => `${n} étudiant(s) réactivé(s)`,
      }),
    },
  ]

  function changerRecherche(valeur) {
    setSearch(valeur)
  }

  function handleReset() {
    changerRecherche('')
    setEtat(ETAT_DEFAUT)
  }

  async function handleDelete(student) {
    const ok = await confirmer({
      titre: "Désactiver l'étudiant",
      message: `${student.prenom} ${student.nom} sera désactivé. Vous pourrez le réactiver avec le filtre « Désactivés ».`,
      bouton: 'Désactiver',
      danger: true,
    })
    if (!ok) return

    try {
      setActionError('')
      await deleteEtudiant(student.id_etudiant)
      notifier('Étudiant désactivé', { annuler: () => handleReactiver(student) })
      liste.recharger()
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function handleReactiver(student) {
    try {
      setActionError('')
      await reactiverEtudiant(student.id_etudiant)
      notifier('Étudiant réactivé')
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
    const texte = student.etat ? 'Actif' : 'Désactivé'
    return <span className={`student-status ${classe}`}>{texte}</span>
  }

  function renderActions(student) {
    // Désactivé : seule action possible, le réactiver
    if (!student.etat) {
      return canManage ? (
        <div className="table-actions">
          <button type="button" className="row-action success-action" onClick={() => handleReactiver(student)}>
            Réactiver
          </button>
        </div>
      ) : null
    }

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
              Désactiver
            </button>
          </>
        )}
      </div>
    )
  }

  const columns = [
    { key: 'name', header: 'Etudiant', render: renderNom, exportValue: (s) => `${s.prenom} ${s.nom}` },
    { key: 'email', header: 'Email' },
    { key: 'telephone', header: 'Téléphone' },
    { key: 'etat', header: 'Statut', render: renderStatut, exportValue: (s) => (s.etat ? 'Actif' : 'Désactivé') },
    { key: 'actions', header: 'Actions', render: renderActions },
  ]

  const titre = isFormateur ? 'Mes étudiants' : 'Étudiants'
  const sousTitre = isFormateur
    ? `${liste.total} étudiant(s) dans vos formations`
    : `${liste.total} étudiant(s) correspondant(s)`

  const messageVide = isFormateur
    ? 'Aucun étudiant dans vos formations.'
    : 'Aucun étudiant trouvé.'

  return (
    <section className="students-main">
      <Header user={user} activeItem="Étudiants" />

      <div className="students-heading">
        <div>
          <h1>{titre}</h1>
          <p>{sousTitre}</p>
        </div>

        <div className="heading-actions">
          {/* Toute la liste filtrée (pas seulement la page) */}
          <BoutonExportCSV columns={columns} charger={liste.toutesLesLignes} nomFichier="etudiants" />
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
      </div>

      <article className="students-panel">
        <SearchFilterBar
          searchValue={search}
          onSearchChange={changerRecherche}
          searchPlaceholder="Rechercher un nom, un e-mail, un téléphone..."
          filters={isFormateur ? [] : [filtreEtat(etat, setEtat)]}
          onReset={handleReset}
        />

        {(liste.error || actionError) && <p className="form-error">{liste.error || actionError}</p>}

        {canManage && (
          <BarreSelection selection={selection} actions={actionsGroupees} enCours={groupe.enCours} libelle="étudiant(s)" />
        )}

        {liste.isLoading ? (
          <p className="students-loading">Chargement des étudiants...</p>
        ) : (
          <Tableau
            columns={columns}
            rows={liste.lignes}
            rowKey="id_etudiant"
            selection={canManage ? selection : null}
            emptyMessage={messageVide}
            wrapperClassName="students-table-wrap"
            className="students-table"
          />
        )}

        <Pagination
          page={liste.page}
          pages={liste.pages}
          total={liste.total}
          limite={liste.limite}
          onChange={liste.setPage}
          libelle="étudiant(s)"
        />
      </article>
    </section>
  )
}

export default Etudiants