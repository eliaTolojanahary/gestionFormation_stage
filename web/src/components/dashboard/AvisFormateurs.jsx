import { useMemo, useState } from 'react'
import Avatar from '../avatar/Avatar'
import Tableau from '../tableau/Tableau'
import SearchFilterBar from '../form/Filter'
import { useAvisFormateurs } from '../../hooks/useAvisFormateurs'
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

// Libellé affiché dans le filtre -> champ trié (null = ordre de l'API : compétents d'abord)
const TRIS = {
  'Avis (compétents d’abord)': null,
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

// Back-office : formateurs classés selon les réactions des étudiants sur leurs supports
function AvisFormateurs() {
  const { formateurs, isLoading, error } = useAvisFormateurs()
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
    },
    {
      key: 'formateur',
      header: 'Formateur',
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
    { key: 'total_reactions', header: 'Total' },
    {
      key: 'taux_positif',
      header: 'Positif',
      render: (row) => <TauxPositif taux={row.taux_positif} />,
    },
    {
      key: 'avis',
      header: 'Avis',
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
          <h2>Avis des étudiants sur les formateurs</h2>
          <p>
            Réactions reçues sur leurs supports. Compétent : au moins 60 % de réactions positives
            (👍 ❤️ 💡) sur 5 réactions ou plus.
          </p>
        </div>
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
