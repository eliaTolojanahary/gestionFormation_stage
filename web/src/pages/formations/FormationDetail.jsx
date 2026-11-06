import { useEffect, useState } from 'react'
import Header from '../../components/header/Header'
import Informations from '../../components/form/Informations'
import SearchFilterBar from '../../components/form/Filter'
import Tableau from '../../components/tableau/Tableau'
import Pagination from '../../components/pagination/Pagination'
import BoutonExportCSV from '../../components/tableau/BoutonExportCSV'
import { useFormation } from '../../hooks/useFormation'
import { useListePaginee } from '../../hooks/useListePaginee'
import { formatMontant } from '../../utils/format'
import './Formations.css'
import CouvertureFormation from './CouvertureFormation'

// Détail d'une formation : informations (tarif, durée, formateur) et étudiants inscrits,
// paginés et cherchés par le serveur (GET /formations/:id/etudiants?page=&recherche=).
function FormationDetail({ user, formationId, onBack, onEdit }) {
  const { getFormation } = useFormation({ charger: false })
  const [formation, setFormation] = useState(null)
  const [error, setError] = useState('')
  const [recherche, setRecherche] = useState('')
  const etudiants = useListePaginee(`/formations/${formationId}/etudiants`, { recherche: recherche.trim() })

  // Dépend de l'id seulement : getFormation change à chaque rendu (sinon la requête repart en boucle)
  useEffect(() => {
    getFormation(formationId).then(setFormation).catch((requestError) => setError(requestError.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationId])

  if (error) return <main className="gestion-page"><Header user={user} activeItem="Formations" /><p className="form-error">{error}</p></main>
  if (!formation) return <main className="gestion-page"><Header user={user} activeItem="Formations" /><p>Chargement...</p></main>
  const columns = [{ key: 'etudiant', header: 'Etudiant', render: (row) => `${row.prenom} ${row.nom}` }, { key: 'email', header: 'Email' }, { key: 'date_inscription', header: 'Inscription' }]
  return (
    <main className="gestion-page">
      <Header user={user} activeItem="Formations" />
      <div className="gestion-heading">
        <div>
          <button type="button" className="back-link" onClick={onBack}>← Retour aux formations</button>
          <h1>{formation.nom}</h1>
          <p>{formation.description || 'Aucune description.'}</p>
        </div>
        {user?.role === 'Super Admin' && <button type="button" className="primary-button" onClick={() => onEdit(formation.id_formation)}>Modifier</button>}
      </div>
      <div className="detail-layout">
        <div>
          <CouvertureFormation formation={formation} grande />
          <Informations title="Informations" items={[{ label: 'Tarif', value: formatMontant(formation.tarif || 0) }, { label: 'Durée', value: `${formation.duree_jours || 0} jours` }, { label: 'Formateur', value: `${formation.prenom_formateur || ''} ${formation.nom_formateur || ''}`.trim() || '-' }]} />
        </div>
        <Informations
          title={`Etudiants inscrits (${etudiants.total})`}
          action={<BoutonExportCSV columns={columns} charger={etudiants.toutesLesLignes} nomFichier={`etudiants_${formation.nom}`} />}
        >
          <SearchFilterBar
            searchValue={recherche}
            onSearchChange={setRecherche}
            searchPlaceholder="Rechercher un nom, un e-mail, un téléphone..."
            filters={[]}
            onReset={() => setRecherche('')}
          />
          {etudiants.error && <p className="form-error">{etudiants.error}</p>}
          <Tableau columns={columns} rows={etudiants.lignes} rowKey="id_etudiant" emptyMessage={etudiants.isLoading ? 'Chargement...' : 'Aucun étudiant inscrit.'} />
          <Pagination page={etudiants.page} pages={etudiants.pages} total={etudiants.total} limite={etudiants.limite} onChange={etudiants.setPage} libelle="étudiant(s)" />
        </Informations>
      </div>
    </main>
  )
}

export default FormationDetail
