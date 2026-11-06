import { useState } from 'react'
import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import { useFormation } from '../../hooks/useFormation'
import { useListePaginee } from '../../hooks/useListePaginee'
import Pagination from '../../components/pagination/Pagination'
import SearchFilterBar from '../../components/form/Filter'
import BoutonExportCSV from '../../components/tableau/BoutonExportCSV'
import BarreSelection from '../../components/tableau/BarreSelection'
import { useRetour } from '../../components/retour/useRetour'
import { useSelection, useActionsGroupees } from '../../hooks/useSelection'
import { formatMontant } from '../../utils/format'
import './Formations.css'
import CouvertureFormation from './CouvertureFormation'
import BadgeEtat from '../../components/etat/BadgeEtat'
import { ETATS, ETAT_DEFAUT, filtreEtat } from '../../utils/etat'

// Liste des formations avec recherche (nom, description, formateur) et filtre « État » (actives par
// défaut, désactivées, toutes), filtrée et paginée par le serveur (GET /formations?page=).
// Un formateur ne voit que ses formations actives ; seul le Super Admin peut créer / modifier /
// désactiver / réactiver, aussi plusieurs formations à la fois (sélection par clic sur les lignes).
function Formations({ user, onCreate, onDetail, onEdit }) {
  const [etat, setEtat] = useState(ETAT_DEFAUT)
  const { deleteFormation, reactiverFormation } = useFormation({ charger: false })
  const { confirmer, notifier } = useRetour()
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState('')

  const isFormateur = user?.role === 'Formateur'
  const canManage = user?.role === 'Super Admin'

  // L'API ne renvoie à un formateur que ses formations actives
  const liste = useListePaginee('/formations', {
    recherche: search.trim(),
    etat: isFormateur ? '' : ETATS[etat],
  })
  const { lignes: filtered, isLoading, error } = liste

  const selection = useSelection(filtered, 'id_formation')
  const groupe = useActionsGroupees({ selection, apres: liste.recharger, setErreur: setActionError })
  const actives = selection.selection.filter((f) => f.etat)
  const inactives = selection.selection.filter((f) => !f.etat)

  const actionsGroupees = [
    {
      libelle: 'Désactiver',
      danger: true,
      nombre: actives.length,
      onClick: () => groupe.lancer({
        lignes: actives,
        confirmation: {
          titre: 'Désactiver les formations',
          message: `${actives.length} formation(s) seront désactivées. Vous pourrez les réactiver avec le filtre « Désactivés ».`,
          bouton: 'Désactiver',
          danger: true,
        },
        action: (f) => deleteFormation(f.id_formation),
        succes: (n) => `${n} formation(s) désactivée(s)`,
      }),
    },
    {
      libelle: 'Réactiver',
      succes: true,
      nombre: inactives.length,
      onClick: () => groupe.lancer({
        lignes: inactives,
        action: (f) => reactiverFormation(f.id_formation),
        succes: (n) => `${n} formation(s) réactivée(s)`,
      }),
    },
  ]

  function handleReset() {
    setSearch('')
    setEtat(ETAT_DEFAUT)
  }

  async function handleDelete(formation) {
    const ok = await confirmer({
      titre: 'Désactiver la formation',
      message: `La formation « ${formation.nom} » sera désactivée. Vous pourrez la réactiver avec le filtre « Désactivés ».`,
      bouton: 'Désactiver',
      danger: true,
    })
    if (!ok) return
    try {
      setActionError('')
      await deleteFormation(formation.id_formation)
      notifier('Formation désactivée', { annuler: () => handleReactiver(formation) })
      liste.recharger()
    } catch (requestError) {
      setActionError(requestError.message)
    }
  }

  async function handleReactiver(formation) {
    try {
      setActionError('')
      await reactiverFormation(formation.id_formation)
      notifier('Formation réactivée')
      liste.recharger()
    } catch (requestError) {
      setActionError(requestError.message)
    }
  }

  const columns = [
    {
      key: 'image',
      header: 'Couverture',
      export: false,
      render: (row) => <CouvertureFormation formation={row} />,
    },
    {
      key: 'nom',
      header: 'Formation',
      render: (row) => (
        <>
          {row.nom}
          <BadgeEtat ligne={row} actif={row.etat} feminin />
        </>
      ),
      exportValue: (row) => row.nom,
    },
    { key: 'description', header: 'Description' },
    {
      key: 'tarif',
      header: 'Tarif',
      render: (row) => formatMontant(row.tarif || 0),
      exportValue: (row) => Number(row.tarif || 0),
    },
    {
      key: 'duree_jours',
      header: 'Durée',
      render: (row) => `${row.duree_jours || 0} jours`,
      exportValue: (row) => Number(row.duree_jours || 0),
    },
    {
      key: 'formateur',
      header: 'Formateur',
      render: (row) =>
        `${row.prenom_formateur || ''} ${row.nom_formateur || ''}`.trim() || '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => !row.etat ? (
        // Désactivée : seule action possible, la réactiver
        canManage && (
          <div className="table-actions">
            <button type="button" className="row-action success-action" onClick={() => handleReactiver(row)}>
              Réactiver
            </button>
          </div>
        )
      ) : (
        <div className="table-actions">
          {/* ✅ Callback au lieu de navigate() */}
          <button
            type="button"
            className="row-action"
            onClick={() => onDetail && onDetail(row.id_formation)}
          >
            Détail
          </button>

          {canManage && (
            <>
              <button
                type="button"
                className="row-action"
                onClick={() => onEdit && onEdit(row.id_formation)}
              >
                Modifier
              </button>
              <button
                type="button"
                className="row-action danger-action"
                onClick={() => handleDelete(row)}
              >
                Désactiver
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <section className="gestion-page">
      <Header user={user} activeItem="Formations" />

      <div className="gestion-heading">
        <div>
          <h1>{isFormateur ? 'Mes formations' : 'Formations'}</h1>
          <p>
            {isFormateur
              ? `${liste.total} formation(s) qui vous est/sont attribuée(s)`
              : `${liste.total} formation(s)`}
          </p>
        </div>

        <div className="heading-actions">
          <BoutonExportCSV columns={columns} charger={liste.toutesLesLignes} nomFichier="formations" />
          {canManage && (
            <button
              type="button"
              className="primary-button"
              /* ✅ Callback au lieu de navigate() */
              onClick={() => onCreate && onCreate()}
            >
              + Nouvelle formation
            </button>
          )}
        </div>
      </div>

      <article className="gestion-panel">
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher une formation..."
          filters={isFormateur ? [] : [filtreEtat(etat, setEtat)]}
          onReset={handleReset}
        />

        {(error || actionError) && <p className="form-error">{error || actionError}</p>}

        {canManage && (
          <BarreSelection selection={selection} actions={actionsGroupees} enCours={groupe.enCours} libelle="formation(s)" />
        )}

        {isLoading ? (
          <p className="gestion-loading">Chargement...</p>
        ) : (
          <Tableau
            columns={columns}
            rows={filtered}
            rowKey="id_formation"
            selection={canManage ? selection : null}
            emptyMessage={
              isFormateur
                ? 'Aucune formation ne vous est attribuée.'
                : 'Aucune formation trouvée.'
            }
            wrapperClassName="gestion-table-wrap"
            className="gestion-table"
          />
        )}

        <Pagination
          page={liste.page}
          pages={liste.pages}
          total={liste.total}
          limite={liste.limite}
          onChange={liste.setPage}
          libelle="formation(s)"
        />
      </article>
    </section>
  )
}

export default Formations