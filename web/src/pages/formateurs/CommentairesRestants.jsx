import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../../components/avatar/Avatar'
import { apiRequest } from '../../utils/api'
import { CHEMINS } from '../../utils/navigation'
import { formatDate } from '../../utils/time'

// Ce qui empêche encore la note des commentaires (sur 10) d'un formateur d'être calculée :
//  - les étudiants attendus qui n'ont pas encore commenté (lien vers leur inscription : à relancer,
//    ou à désactiver s'ils ont abandonné, et ils ne sont plus attendus) ;
//  - les commentaires écrits mais pas encore notés (à noter dans le tableau en dessous).
// Données du classement (GET /formateurs/avis, sans période) : nb_attendus, nb_commentaires, nb_notes,
// etudiants_manquants. `version` change quand un commentaire est noté : la liste est relue.
function CommentairesRestants({ version = 0 }) {
  const [formateurs, setFormateurs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let annule = false
    apiRequest('/formateurs/avis')
      .then((reponse) => {
        if (annule) return
        setFormateurs(reponse.data || [])
        setError('')
      })
      .catch((requestError) => !annule && setError(requestError.message || 'Chargement impossible.'))
      .finally(() => !annule && setIsLoading(false))
    return () => {
      annule = true
    }
  }, [version])

  const restants = formateurs
    .map((f) => ({
      ...f,
      manquants: f.etudiants_manquants ?? [],
      aNoter: (f.nb_commentaires ?? 0) - (f.nb_notes ?? 0),
    }))
    .filter((f) => f.manquants.length > 0 || f.aNoter > 0)

  return (
    <article className="dashboard-card restants-card">
      <div className="card-heading">
        <div>
          <h2>Ce qui reste avant la note des commentaires</h2>
          <p>
            La note des commentaires d'un formateur (sur 10) n'est calculée que quand tous ses étudiants ont
            commenté et que tous les commentaires sont notés. Un étudiant qui a abandonné : désactivez son
            inscription, il n'est plus attendu.
          </p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      {isLoading ? (
        <p className="gestion-loading">Chargement...</p>
      ) : !error && restants.length === 0 ? (
        <p className="avis-vide">Rien en attente : toutes les notes des commentaires sont calculées.</p>
      ) : (
        <ul className="restants-liste">
          {restants.map((f) => (
            <li key={f.id_utilisateur}>
              <div className="avis-formateur">
                <Avatar photo={f.photo} prenom={f.prenom} nom={f.nom} size="sm" shape="circle" />
                <div>
                  <strong>{f.prenom} {f.nom}</strong>
                  <span>{f.nb_commentaires ?? 0}/{f.nb_attendus ?? 0} commentés</span>
                </div>
              </div>
              <div className="restants-detail">
                {f.manquants.length > 0 && (
                  <div>
                    <span className="restants-titre">Pas encore commenté</span>
                    <ul>
                      {f.manquants.map((e) => (
                        <li key={e.id_inscription}>
                          <Link to={CHEMINS.inscription(e.id_inscription)}>{e.etudiant_prenom} {e.etudiant_nom}</Link>
                          <span>{e.formation_nom}, fin le {formatDate(e.date_fin)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {f.aNoter > 0 && (
                  <span className="avis-badge avis-neutre">
                    {f.aNoter} commentaire{f.aNoter > 1 ? 's' : ''} à noter
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default CommentairesRestants
