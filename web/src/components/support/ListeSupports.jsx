import { useMemo, useState } from 'react'
import SupportItem from './SupportItem'
import { typeFichier } from '../../utils/texteRiche'
import './ListeSupports.css'

// Nombre de supports affichés d'un coup ; « Voir plus » en ajoute autant
const PAR_PAGE = 5

const TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'texte', label: 'Texte seul' },
  { value: 'pdf', label: 'PDF' },
  { value: 'image', label: 'Image' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Vidéo' },
]

const TRIS = {
  recents: { label: 'Plus récents', comparer: (a, b) => new Date(b.date_publication) - new Date(a.date_publication) },
  anciens: { label: 'Plus anciens', comparer: (a, b) => new Date(a.date_publication) - new Date(b.date_publication) },
  titre: { label: 'Titre (A → Z)', comparer: (a, b) => a.titre.localeCompare(b.titre, 'fr', { sensitivity: 'base' }) },
}

// Texte cherchable d'un support : titre, formation et texte mis en forme sans ses balises HTML
function texteRecherche(support) {
  const contenu = (support.contenu || '').replace(/<[^>]+>/g, ' ')
  return `${support.titre} ${support.nom_formation || ''} ${contenu}`.toLowerCase()
}

// Supports publiés de l'espace formateur : recherche, filtres (formation, type), tri et affichage par pages
function ListeSupports({ supports, formations, user, userId, commentBusy, onSupportDeleted }) {
  const [recherche, setRecherche] = useState('')
  const [idFormation, setIdFormation] = useState('')
  const [type, setType] = useState('')
  const [tri, setTri] = useState('recents')
  const [nbVisibles, setNbVisibles] = useState(PAR_PAGE)

  const filtres = useMemo(() => {
    const mots = recherche.trim().toLowerCase().split(/\s+/).filter(Boolean)
    return supports
      .filter((support) => !idFormation || Number(support.id_formation) === Number(idFormation))
      .filter((support) => {
        if (!type) return true
        if (type === 'texte') return !support.fichier
        return support.fichier && typeFichier(support.fichier) === type
      })
      .filter((support) => {
        const texte = texteRecherche(support)
        return mots.every((mot) => texte.includes(mot))
      })
      .sort(TRIS[tri].comparer)
  }, [supports, recherche, idFormation, type, tri])

  // Tout changement de recherche / filtre / tri revient à la première page
  function changer(setter) {
    return (event) => {
      setter(event.target.value)
      setNbVisibles(PAR_PAGE)
    }
  }

  const filtreActif = recherche.trim() || idFormation || type
  const visibles = filtres.slice(0, nbVisibles)
  const restants = filtres.length - visibles.length

  function reinitialiser() {
    setRecherche('')
    setIdFormation('')
    setType('')
    setNbVisibles(PAR_PAGE)
  }

  return (
    <div className="support-list">
      <div className="supports-entete">
        <h2>Supports et commentaires</h2>
        <small>
          {filtreActif ? `${filtres.length} sur ${supports.length} support(s)` : `${supports.length} support(s)`}
        </small>
      </div>

      {supports.length > 0 && (
        <div className="supports-outils">
          <input
            type="search"
            className="supports-recherche"
            value={recherche}
            onChange={changer(setRecherche)}
            placeholder="Rechercher un titre, un mot du texte…"
            aria-label="Rechercher un support"
          />
          {formations.length > 1 && (
            <select value={idFormation} onChange={changer(setIdFormation)} aria-label="Filtrer par formation">
              <option value="">Toutes les formations</option>
              {formations.map((formation) => (
                <option key={formation.id_formation} value={formation.id_formation}>
                  {formation.nom}
                </option>
              ))}
            </select>
          )}
          <select value={type} onChange={changer(setType)} aria-label="Filtrer par type">
            {TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={tri} onChange={changer(setTri)} aria-label="Trier les supports">
            {Object.entries(TRIS).map(([valeur, option]) => (
              <option key={valeur} value={valeur}>{option.label}</option>
            ))}
          </select>
        </div>
      )}

      {supports.length === 0 ? (
        <p className="muted-text">Aucun support publié.</p>
      ) : filtres.length === 0 ? (
        <p className="muted-text">
          Aucun support ne correspond.{' '}
          <button type="button" className="supports-lien" onClick={reinitialiser}>Effacer les filtres</button>
        </p>
      ) : (
        <>
          {visibles.map((support) => (
            <SupportItem
              key={support.id_support}
              support={support}
              userId={userId}
              userRole={user.role}
              currentUser={user}
              commentBusy={commentBusy}
              canComment={true}
              canDeleteSupport={Number(support.id_utilisateur) === Number(userId)}
              onSupportDeleted={onSupportDeleted}
            />
          ))}
          {restants > 0 && (
            <button
              type="button"
              className="secondary-button supports-voir-plus"
              onClick={() => setNbVisibles((nombre) => nombre + PAR_PAGE)}
            >
              Voir plus ({restants} restant{restants > 1 ? 's' : ''})
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default ListeSupports
