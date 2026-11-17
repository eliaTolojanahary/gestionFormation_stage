import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../avatar/Avatar'
import Icon from '../icon/Icon'
import Tableau from '../tableau/Tableau'
import SearchFilterBar from '../form/Filter'
import Pagination from '../pagination/Pagination'
import BarreSelection from '../tableau/BarreSelection'
import { useRetour } from '../retour/useRetour'
import { useListePaginee } from '../../hooks/useListePaginee'
import { useSelection, useActionsGroupees } from '../../hooks/useSelection'
import { apiRequest } from '../../utils/api'
import { CHEMINS } from '../../utils/navigation'
import { formatDate } from '../../utils/time'
import './EtudiantsARisque.css'

// Niveaux calculés par l'API (backend services/decrochageService.js)
const NIVEAUX = {
  a_contacter: { label: 'À contacter', className: 'risque-contacter' },
  a_surveiller: { label: 'À surveiller', className: 'risque-surveiller' },
}
const TOUS = 'Tous'
// Libellé du filtre « Niveau » -> code envoyé à l'API (?niveau=)
const CODE_NIVEAU = Object.fromEntries(Object.entries(NIVEAUX).map(([code, n]) => [n.label, code]))
const DELAI_RELANCE_JOURS = 3 // même règle que le serveur, qui refuse une relance trop rapprochée
const UN_JOUR_MS = 24 * 60 * 60 * 1000

const relanceRecente = (date) => Boolean(date) && Date.now() - new Date(date).getTime() < DELAI_RELANCE_JOURS * UN_JOUR_MS

// Tableau de bord : étudiants qui risquent de décrocher, les plus urgents d'abord, avec leurs raisons
// (assiduité des 10 derniers jours de cours, silence, échéances en retard) et un bouton « Relancer ».
// Situation actuelle : ne dépend pas de la période choisie pour les indicateurs.
function EtudiantsARisque() {
  const { notifier } = useRetour()
  const [enCours, setEnCours] = useState(null)
  const [actionError, setActionError] = useState('')

  const [search, setSearch] = useState('')
  const [niveau, setNiveau] = useState(TOUS)

  // 10 par page, les plus urgents d'abord ; recherche, filtre et compteurs (sur toute la liste) faits par le serveur
  const liste = useListePaginee('/decrochage', { recherche: search.trim(), niveau: CODE_NIVEAU[niveau] || '' })
  const { lignes: etudiants, isLoading, error, total } = liste
  const { a_contacter: nbContacter = 0, a_surveiller: nbSurveiller = 0 } = liste.extra.compteurs || {}

  // Sélection multiple (comme les autres tableaux) : relance groupée, une requête par étudiant
  // (même route que le bouton de la ligne : le serveur refuse toujours une relance trop rapprochée)
  const selection = useSelection(etudiants, 'id_inscription')
  const groupe = useActionsGroupees({ selection, apres: liste.recharger, setErreur: setActionError })
  const aRelancer = selection.selection.filter((e) => !relanceRecente(e.derniere_relance))

  const actionsGroupees = [
    {
      libelle: 'Relancer',
      nombre: aRelancer.length,
      onClick: () => groupe.lancer({
        lignes: aRelancer,
        confirmation: {
          titre: 'Relancer les étudiants',
          message: `${aRelancer.length} étudiant(s) recevront une notification et un e-mail bienveillants.` +
            (aRelancer.length < selection.nombre ? ` Les étudiants relancés il y a moins de ${DELAI_RELANCE_JOURS} jours sont ignorés.` : ''),
          bouton: 'Relancer',
        },
        action: (e) => apiRequest(`/inscriptions/${e.id_inscription}/relancer`, { method: 'POST' }),
        succes: (n) => `${n} étudiant(s) relancé(s)`,
      }),
    },
  ]

  function resetFilters() {
    setSearch('')
    setNiveau(TOUS)
  }

  async function relancer(ligne) {
    setEnCours(ligne.id_inscription)
    setActionError('')
    try {
      const reponse = await apiRequest(`/inscriptions/${ligne.id_inscription}/relancer`, { method: 'POST' })
      notifier(reponse.message || 'Relance envoyée')
      liste.recharger() // relit la page (date de dernière relance)
    } catch (requestError) {
      setActionError(requestError.message || 'Relance impossible.')
    } finally {
      setEnCours(null)
    }
  }

  const columns = [
    {
      key: 'etudiant',
      header: 'Étudiant',
      render: (row) => (
        <div className="avis-formateur">
          <Avatar photo={row.photo} prenom={row.prenom} nom={row.nom} size="sm" shape="circle" />
          <div>
            <Link to={CHEMINS.inscription(row.id_inscription)} className="risque-lien">
              {row.prenom} {row.nom}
            </Link>
            <span>{row.formation_nom}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'niveau',
      header: 'Niveau',
      render: (row) => (
        <span className={`avis-badge ${NIVEAUX[row.niveau]?.className || ''}`} title={`Score ${row.score} sur 6`}>
          {NIVEAUX[row.niveau]?.label || row.niveau}
        </span>
      ),
    },
    {
      key: 'raisons',
      header: 'Pourquoi',
      render: (row) => (
        <ul className="risque-raisons">
          {row.raisons.map((raison) => <li key={raison}>{raison}</li>)}
        </ul>
      ),
    },
    {
      key: 'relance',
      header: '',
      render: (row) => {
        const recente = relanceRecente(row.derniere_relance)
        return (
          <div className="risque-relance">
            <button
              type="button"
              className="row-action"
              onClick={() => relancer(row)}
              disabled={recente || enCours === row.id_inscription || groupe.enCours}
              title={recente ? `Une relance tous les ${DELAI_RELANCE_JOURS} jours au plus` : "Notification et e-mail bienveillants à l'étudiant"}
            >
              <Icon name="send" className="icon-inline" />
              {enCours === row.id_inscription ? 'Envoi...' : 'Relancer'}
            </button>
            {row.derniere_relance && <span>Relancé le {formatDate(row.derniere_relance)}</span>}
          </div>
        )
      },
    },
  ]

  return (
    <article className="dashboard-card risque-card">
      <div className="card-heading">
        <div>
          <h2>
            <Icon name="alert" className="icon-inline" /> Étudiants à risque de décrochage
          </h2>
          <p>
            Assiduité des 10 derniers jours de cours, dernier cours ouvert et échéances en retard.
            Les plus urgents d'abord.
          </p>
        </div>
        {!error && nbContacter + nbSurveiller > 0 && (
          <div className="risque-compteurs">
            {nbContacter > 0 && <span className="avis-badge risque-contacter">{nbContacter} à contacter</span>}
            {nbSurveiller > 0 && <span className="avis-badge risque-surveiller">{nbSurveiller} à surveiller</span>}
          </div>
        )}
      </div>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher un étudiant ou une formation..."
        filters={[{ name: 'niveau', label: 'Niveau', value: niveau, onChange: setNiveau, options: [TOUS, ...Object.keys(CODE_NIVEAU)] }]}
        onReset={resetFilters}
      />

      <BarreSelection selection={selection} actions={actionsGroupees} enCours={groupe.enCours} libelle="étudiant(s)" />

      {(error || actionError) && <p className="form-error">{error || actionError}</p>}
      {isLoading ? (
        <p className="gestion-loading carte-chargement">Chargement...</p>
      ) : (
        !error && (
          <Tableau
            columns={columns}
            rows={etudiants}
            rowKey="id_inscription"
            selection={selection}
            emptyMessage={search.trim() || niveau !== TOUS ? 'Aucun étudiant ne correspond à la recherche.' : 'Aucun étudiant à risque pour le moment.'}
            wrapperClassName="gestion-table-wrap"
            className="gestion-table risque-table"
          />
        )
      )}

      {!error && total > 0 && (
        <Pagination
          page={liste.page}
          pages={liste.pages}
          total={total}
          limite={liste.limite}
          onChange={liste.setPage}
          libelle="étudiant(s)"
        />
      )}
    </article>
  )
}

export default EtudiantsARisque
