import { useState } from 'react'
import Tableau from '../tableau/Tableau'
import SearchFilterBar from '../form/Filter'
import Pagination from '../pagination/Pagination'
import { useRetour } from '../retour/useRetour'
import { useListePaginee } from '../../hooks/useListePaginee'
import { apiRequest } from '../../utils/api'
import './AvisFormateurs.css'

const TOUS = 'Tous'
// Libellé du filtre -> code envoyé à l'API (?statut=)
const STATUTS = { 'À noter': 'a_noter', Notés: 'notes' }

// Note sur 10 d'un commentaire, enregistrée avec le bouton de la ligne
function ChampNote({ ligne, onEnregistrer }) {
  const [note, setNote] = useState(ligne.note ?? '')
  const [envoi, setEnvoi] = useState(false)

  async function enregistrer() {
    setEnvoi(true)
    await onEnregistrer(ligne.id_note, note)
    setEnvoi(false)
  }

  return (
    <div className="avis-note">
      <input
        type="text"
        inputMode="decimal"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="/ 10"
        aria-label={`Note sur 10 du commentaire de ${ligne.etudiant_prenom} ${ligne.etudiant_nom}`}
      />
      <button type="button" className="row-action" onClick={enregistrer} disabled={envoi || note === ''}>
        {envoi ? '...' : 'Enregistrer'}
      </button>
    </div>
  )
}

// Commentaires de fin de formation écrits par les étudiants. L'Accueil et le Super Admin les notent
// sur 10 : la moyenne donne la moitié de la note du formateur.
function CommentairesFormateurs({ onNote }) {
  const { notifier } = useRetour()
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState(TOUS)
  const [actionError, setActionError] = useState('')

  const liste = useListePaginee('/formateurs/commentaires', {
    recherche: search.trim(),
    statut: STATUTS[statut] || '',
  })
  const { lignes, isLoading, error } = liste

  async function enregistrerNote(id, note) {
    setActionError('')
    try {
      await apiRequest(`/formateurs/commentaires/${id}/note`, {
        method: 'PUT',
        body: JSON.stringify({ note }),
      })
      notifier('Note enregistrée')
      liste.recharger()
      onNote?.()
    } catch (requestError) {
      setActionError(requestError.message)
    }
  }

  const columns = [
    {
      key: 'formateur',
      header: 'Formateur',
      render: (row) => (
        <div className="avis-formateur">
          <div>
            <strong>{row.formateur_prenom} {row.formateur_nom}</strong>
            <span>{row.formation_nom}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'etudiant',
      header: 'Étudiant',
      render: (row) => `${row.etudiant_prenom} ${row.etudiant_nom}`,
    },
    {
      key: 'commentaire',
      header: 'Commentaire',
      render: (row) => <p className="avis-commentaire">{row.commentaire}</p>,
    },
    {
      key: 'note',
      header: 'Note / 10',
      render: (row) => <ChampNote key={`${row.id_note}-${row.note}`} ligne={row} onEnregistrer={enregistrerNote} />,
    },
  ]

  return (
    <article className="dashboard-card avis-card">
      <div className="card-heading avis-heading">
        <div>
          <h2>Commentaires des étudiants sur les formateurs</h2>
          <p>Écrits à la fin de chaque formation. Le formateur ne les voit pas.</p>
        </div>
      </div>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un formateur, un étudiant ou une formation..."
        filters={[
          {
            name: 'statut',
            label: 'Statut',
            value: statut,
            onChange: setStatut,
            options: [TOUS, ...Object.keys(STATUTS)],
          },
        ]}
        onReset={() => { setSearch(''); setStatut(TOUS) }}
      />

      {(error || actionError) && <p className="form-error">{error || actionError}</p>}

      {isLoading ? (
        <p className="gestion-loading">Chargement...</p>
      ) : (
        <Tableau
          columns={columns}
          rows={lignes}
          rowKey="id_note"
          emptyMessage="Aucun commentaire."
          wrapperClassName="gestion-table-wrap"
          className="gestion-table avis-table"
        />
      )}

      <Pagination
        page={liste.page}
        pages={liste.pages}
        total={liste.total}
        limite={liste.limite}
        onChange={liste.setPage}
        libelle="commentaire(s)"
      />
    </article>
  )
}

export default CommentairesFormateurs
