import { useMemo, useState } from 'react'
import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import { useFormation } from '../../hooks/useFormation'
import SearchFilterBar from '../../components/form/Filter'
import './Formations.css'


function Formations({ user, onCreate, onDetail, onEdit }) {
  const { formations, isLoading, error, deleteFormation } = useFormation()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Tous')
  const [actionError, setActionError] = useState('')
  const canManage = user?.role === 'Super Admin'

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return formations.filter((formation) => {
      const fullText = `${formation.nom} ${formation.description || ''}`.toLowerCase()
      const matchesSearch = fullText.includes(normalizedSearch)
      const matchesStatus =
        status === 'Tous' ||
        (status === 'Actif' && formation.etat) ||
        (status === 'Inactif' && !formation.etat)

      return matchesSearch && matchesStatus
    })
  }, [formations, search, status])

  function handleReset() {
    setSearch('')
    setStatus('Tous')
  }

  async function handleDelete(formation) {
    if (!window.confirm(`Supprimer la formation « ${formation.nom} » ?`)) return
    try {
      setActionError('')
      await deleteFormation(formation.id_formation)
    } catch (requestError) {
      setActionError(requestError.message)
    }
  }

  const columns = [
    { key: 'nom', header: 'Formation' },
    { key: 'description', header: 'Description' },
    { key: 'tarif', header: 'Tarif', render: (row) => `${Number(row.tarif || 0).toLocaleString('fr-FR')} MGA` },
    { key: 'duree_jours', header: 'Durée', render: (row) => `${row.duree_jours || 0} jours` },
    { key: 'formateur', header: 'Formateur', render: (row) => `${row.prenom_formateur || ''} ${row.nom_formateur || ''}`.trim() || '-' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="table-actions">
          <button type="button" className="row-action" onClick={() => onDetail(row.id_formation)}>Détail</button>
          {canManage && (
            <>
              <button type="button" className="row-action" onClick={() => onEdit(row.id_formation)}>Modifier</button>
              <button type="button" className="row-action danger-action" onClick={() => handleDelete(row)}>Supprimer</button>
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
          <h1>Formations</h1>
          <p>{formations.length} formations enregistrées</p>
        </div>
        {canManage && (
          <button type="button" className="primary-button" onClick={onCreate}>
            + Nouvelle formation
          </button>
        )}
      </div>

      <article className="gestion-panel">
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher une formation..."
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
          <p className="gestion-loading">Chargement...</p>
        ) : (
          <Tableau
            columns={columns}
            rows={filtered}
            rowKey="id_formation"
            emptyMessage="Aucune formation trouvée."
            wrapperClassName="gestion-table-wrap"
            className="gestion-table"
          />
        )}
      </article>
    </section>
  )
}

export default Formations