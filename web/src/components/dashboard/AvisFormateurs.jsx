import { useMemo, useState } from 'react'
import Avatar from '../avatar/Avatar'
import Tableau from '../tableau/Tableau'
import SearchFilterBar from '../form/Filter'
import BoutonExportCSV from '../tableau/BoutonExportCSV'
import { useAvisFormateurs } from '../../hooks/useAvisFormateurs'
import { PERIODE_TOUT, libellePeriode } from '../../utils/periodes'
import './AvisFormateurs.css'

const TOUS = 'Tous'

// Libellés des avis calculés par l'API (reactionService.AVIS)
const AVIS = {
  competent: { label: 'Compétent', className: 'avis-competent' },
  non_competent: { label: 'Non compétent', className: 'avis-non-competent' },
  pas_assez_avis: { label: "Pas assez d'avis", className: 'avis-neutre' },
}

// Réactions affichées en pastilles, utilisables aussi comme critère de tri
const REACTIONS = [
  { cle: 'nb_like', icon: '👍', label: "J'aime" },
  { cle: 'nb_coeur', icon: '❤️', label: "J'adore" },
  { cle: 'nb_utile', icon: '💡', label: 'Utile' },
  { cle: 'nb_dislike', icon: '👎', label: "Je n'aime pas" },
]

// Note sur 10 ou sur 20 ; « — » tant qu'elle n'est pas calculable
const afficherNote = (note) => (note === null || note === undefined ? '—' : String(note).replace('.', ','))

// Libellé affiché dans le filtre -> champ trié (null = ordre de l'API : meilleure note sur 20 d'abord)
const TRIS = {
  'Note sur 20': null,
  'Note des réactions': 'note_reactions',
  'Note des commentaires': 'note_commentaires',
  '% positif': 'taux_positif',
  'Nombre de réactions': 'total_reactions',
  'Nombre de supports': 'nb_supports',
  ...Object.fromEntries(REACTIONS.map((r) => [`${r.icon} ${r.label}`, r.cle])),
}
const TRI_DEFAUT = Object.keys(TRIS)[0]

// Barre de progression du taux de réactions positives (couleur selon le niveau)
function TauxPositif({ taux }) {
  if (taux === null || taux === undefined) return <span className="avis-vide">—</span>
  const niveau = taux >= 60 ? 'haut' : taux >= 40 ? 'moyen' : 'bas'
  return (
    <div className="avis-taux">
      <div className="avis-taux-barre">
        <span className={`avis-taux-${niveau}`} style={{ width: `${taux}%` }} />
      </div>
      <strong>{taux} %</strong>
    </div>
  )
}

// Back-office : classement des formateurs sur 20 (réactions sur 10 + commentaires notés sur 10).
// La période { debut, fin } vient du filtre « Du … au … » du tableau de bord.
// `version` change quand un commentaire est noté : le classement est alors relu.
function AvisFormateurs({ periode = PERIODE_TOUT, version = 0 }) {
  const { formateurs, isLoading, error } = useAvisFormateurs(periode, version)
  const [search, setSearch] = useState('')
  const [avisFilter, setAvisFilter] = useState(TOUS)
  const [tri, setTri] = useState(TRI_DEFAUT)

  const lignes = useMemo(() => {
    const searchLower = search.toLowerCase().trim()
    const filtres = formateurs.filter((f) => {
      const nom = `${f.prenom} ${f.nom}`.toLowerCase()
      const matchesSearch = !searchLower || nom.includes(searchLower)
      const matchesAvis = avisFilter === TOUS || AVIS[f.avis]?.label === avisFilter
      return matchesSearch && matchesAvis
    })
    const champ = TRIS[tri]
    if (!champ) return filtres
    return [...filtres].sort((a, b) => (b[champ] ?? -1) - (a[champ] ?? -1))
  }, [formateurs, search, avisFilter, tri])

  function resetFilters() {
    setSearch('')
    setAvisFilter(TOUS)
    setTri(TRI_DEFAUT)
  }

  const columns = [
    {
      key: 'rang',
      header: '#',
      render: (_row, index) => <span className="avis-rang">{index + 1}</span>,
      exportValue: (_row, index) => index + 1,
    },
    {
      key: 'formateur',
      header: 'Formateur',
      exportValue: (row) => `${row.prenom} ${row.nom}`,
      render: (row) => (
        <div className="avis-formateur">
          <Avatar photo={row.photo} prenom={row.prenom} nom={row.nom} size="sm" shape="circle" />
          <div>
            <strong>{row.prenom} {row.nom}</strong>
            <span>{row.nb_supports} support{row.nb_supports > 1 ? 's' : ''}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'reactions',
      header: 'Réactions',
      export: false, // remplacée dans le fichier par une colonne par réaction (ci-dessous)
      render: (row) => (
        <div className="avis-reactions">
          {REACTIONS.map((r) => (
            <span
              key={r.cle}
              className={`avis-pastille ${r.cle === 'nb_dislike' ? 'avis-pastille-negative' : ''}`}
              title={r.label}
            >
              {r.icon} {row[r.cle] ?? 0}
            </span>
          ))}
        </div>
      ),
    },
    { key: 'nb_supports', header: 'Supports', exportSeulement: true },
    ...REACTIONS.map((r) => ({ key: r.cle, header: r.label, exportSeulement: true })),
    { key: 'total_reactions', header: 'Total' },
    {
      key: 'note_reactions',
      header: 'Réactions / 10',
      render: (row) => afficherNote(row.note_reactions),
      exportValue: (row) => row.note_reactions,
    },
    {
      key: 'note_commentaires',
      header: 'Commentaires / 10',
      render: (row) => afficherNote(row.note_commentaires),
      exportValue: (row) => row.note_commentaires,
    },
    {
      key: 'note_finale',
      header: 'Note / 20',
      render: (row) => <strong>{afficherNote(row.note_finale)}</strong>,
      exportValue: (row) => row.note_finale,
    },
    {
      key: 'taux_positif',
      header: 'Positif',
      render: (row) => <TauxPositif taux={row.taux_positif} />,
      exportValue: (row) => row.taux_positif,
      exportHeader: 'Positif (%)',
    },
    {
      key: 'avis',
      header: 'Avis',
      exportValue: (row) => AVIS[row.avis]?.label || row.avis,
      render: (row) => (
        <span className={`avis-badge ${AVIS[row.avis]?.className || ''}`}>
          {AVIS[row.avis]?.label || row.avis}
        </span>
      ),
    },
  ]

  return (
    <article className="dashboard-card avis-card">
      <div className="card-heading avis-heading">
        <div>
          <h2>Classement des formateurs</h2>
          <p>
            Note sur 20 : réactions sur leurs supports (10 points, à partir de 5 réactions) + moyenne des
            commentaires notés (10 points). Compétent : au moins 60 % de réactions positives (👍 ❤️ 💡).
            {` Données ${libellePeriode(periode)}.`}
          </p>
        </div>
        <BoutonExportCSV columns={columns} lignes={lignes} nomFichier="classement_formateurs" />
      </div>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un formateur..."
        filters={[
          {
            name: 'avis',
            label: 'Avis',
            value: avisFilter,
            onChange: setAvisFilter,
            options: [TOUS, ...Object.values(AVIS).map((a) => a.label)],
          },
          {
            name: 'tri',
            label: 'Trier par',
            value: tri,
            onChange: setTri,
            options: Object.keys(TRIS),
          },
        ]}
        onReset={resetFilters}
      />

      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <p className="gestion-loading">Chargement...</p>
      ) : (
        <Tableau
          columns={columns}
          rows={lignes}
          rowKey="id_utilisateur"
          emptyMessage="Aucun formateur trouvé."
          wrapperClassName="gestion-table-wrap"
          className="gestion-table avis-table"
        />
      )}
    </article>
  )
}

export default AvisFormateurs
