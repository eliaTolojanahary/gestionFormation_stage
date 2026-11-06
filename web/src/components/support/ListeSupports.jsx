import { useEffect, useRef, useState } from 'react'
import SupportItem from './SupportItem'
import { useSupport } from '../../hooks/useSupport'
import './ListeSupports.css'

// Nombre de supports demandés au serveur à chaque « Voir plus »
const PAR_PAGE = 5
// Délai avant d'envoyer la recherche au serveur (pas une requête à chaque lettre tapée)
const DELAI_RECHERCHE = 350

const TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'texte', label: 'Texte seul' },
  { value: 'pdf', label: 'PDF' },
  { value: 'image', label: 'Image' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Vidéo' },
]

// Mêmes clés que l'API (GET /supports?tri=)
const TRIS = {
  recents: 'Plus récents',
  anciens: 'Plus anciens',
  titre: 'Titre (A → Z)',
}

// Supports publiés de l'espace formateur : recherche (titre, formation, texte), filtres (formation,
// type) et tri faits par le serveur (GET /supports), affichés par pages de PAR_PAGE.
// `actualisation` : changer sa valeur recharge la liste (ex. après la publication d'un support).
function ListeSupports({ formations, user, userId, commentBusy, rechercheInitiale = '', actualisation = 0 }) {
  const { listerSupports, error } = useSupport()
  const [supports, setSupports] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [chargement, setChargement] = useState(true)

  const [recherche, setRecherche] = useState(rechercheInitiale)
  const [rechercheEnvoyee, setRechercheEnvoyee] = useState(rechercheInitiale)
  const [idFormation, setIdFormation] = useState('')
  const [type, setType] = useState('')
  const [tri, setTri] = useState('recents')
  // Numéro de la dernière demande : une réponse arrivée après un changement de filtre est ignorée
  const demande = useRef(0)

  useEffect(() => {
    const minuterie = setTimeout(() => setRechercheEnvoyee(recherche), DELAI_RECHERCHE)
    return () => clearTimeout(minuterie)
  }, [recherche])

  // numero 1 : remplace la liste ; sinon la page est ajoutée à la suite
  async function charger(numero) {
    const id = ++demande.current
    setChargement(true)
    try {
      const resultat = await listerSupports(
        { recherche: rechercheEnvoyee, id_formation: idFormation, type, tri },
        numero,
        PAR_PAGE
      )
      if (id !== demande.current) return
      setSupports((actuels) => (numero === 1 ? resultat.elements : [...actuels, ...resultat.elements]))
      setTotal(resultat.total)
      setPage(numero)
    } catch {
      // l'erreur est exposée par useSupport (error), affichée plus bas
    } finally {
      if (id === demande.current) setChargement(false)
    }
  }

  // Tout changement de recherche / filtre / tri repart de la première page
  useEffect(() => {
    charger(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rechercheEnvoyee, idFormation, type, tri, actualisation])

  const filtreActif = rechercheEnvoyee.trim() || idFormation || type
  const restants = Math.max(0, total - supports.length)

  function reinitialiser() {
    setRecherche('')
    setRechercheEnvoyee('')
    setIdFormation('')
    setType('')
  }

  // Support supprimé : retiré de la liste sans tout recharger
  function retirer(idSupport) {
    setSupports((actuels) => actuels.filter((s) => s.id_support !== idSupport))
    setTotal((actuel) => Math.max(0, actuel - 1))
  }

  const aucunSupport = !chargement && total === 0 && !filtreActif

  return (
    <div className="support-list">
      <div className="supports-entete">
        <h2>Supports et commentaires</h2>
        <small>{filtreActif ? `${total} support(s) trouvé(s)` : `${total} support(s)`}</small>
      </div>

      {!aucunSupport && (
        <div className="supports-outils">
          <input
            type="search"
            className="supports-recherche"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher un titre, un mot du texte…"
            aria-label="Rechercher un support"
          />
          {formations.length > 1 && (
            <select value={idFormation} onChange={(event) => setIdFormation(event.target.value)} aria-label="Filtrer par formation">
              <option value="">Toutes les formations</option>
              {formations.map((formation) => (
                <option key={formation.id_formation} value={formation.id_formation}>
                  {formation.nom}
                </option>
              ))}
            </select>
          )}
          <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filtrer par type">
            {TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={tri} onChange={(event) => setTri(event.target.value)} aria-label="Trier les supports">
            {Object.entries(TRIS).map(([valeur, label]) => (
              <option key={valeur} value={valeur}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {aucunSupport ? (
        <p className="muted-text">Aucun support publié.</p>
      ) : !chargement && supports.length === 0 ? (
        <p className="muted-text">
          Aucun support ne correspond.{' '}
          <button type="button" className="supports-lien" onClick={reinitialiser}>Effacer les filtres</button>
        </p>
      ) : (
        <>
          {supports.map((support) => (
            <SupportItem
              key={support.id_support}
              support={support}
              userId={userId}
              userRole={user.role}
              currentUser={user}
              commentBusy={commentBusy}
              canComment={true}
              canDeleteSupport={Number(support.id_utilisateur) === Number(userId)}
              onSupportDeleted={retirer}
            />
          ))}
          {restants > 0 && (
            <button
              type="button"
              className="secondary-button supports-voir-plus"
              onClick={() => charger(page + 1)}
              disabled={chargement}
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
