import { dependanceDesactivee, estActif } from '../../utils/etat'

// Badge à côté d'une ligne de tableau : « Désactivé(e) » si la ligne elle-même l'est,
// sinon l'élément dont elle dépend qui est désactivé (ex. « Étudiant désactivé »).
// actif : état de la ligne ; feminin : « Désactivée » (inscription, formation, échéance)
function BadgeEtat({ ligne, actif, feminin = false }) {
  if (!estActif(actif)) {
    return <span className="etat-badge desactive">{feminin ? 'Désactivée' : 'Désactivé'}</span>
  }
  const dependance = dependanceDesactivee(ligne)
  if (!dependance) return null
  return (
    <span className="etat-badge dependance" title="Réactivez cet élément d'abord pour agir sur cette ligne">
      {dependance}
    </span>
  )
}

export default BadgeEtat
