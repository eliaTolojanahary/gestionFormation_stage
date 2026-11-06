// Éléments désactivés (suppression logique) : filtre « État » des listes et dépendances.

// Libellés du filtre -> valeur envoyée à l'API (?etat=) ; « Actifs » par défaut
export const ETATS = { Actifs: 'actif', Désactivés: 'inactif', Tous: 'tous' }
export const ETAT_DEFAUT = 'Actifs'

// Entrée du filtre « État » pour <SearchFilterBar filters={[...]} />
export function filtreEtat(valeur, onChange) {
  return { name: 'etat', label: 'État', value: valeur, onChange, options: Object.keys(ETATS) }
}

// Une colonne etat / *_actif / *_active vaut 0 ou 1 (MySQL) ; absente = actif
export const estActif = (valeur) => valeur === undefined || valeur === null || Boolean(Number(valeur))

// Premier élément dont dépend la ligne et qui est désactivé, ex. « Étudiant désactivé » ;
// null si tout est actif. Une action sur cette ligne sera refusée par le serveur.
const DEPENDANCES = [
  ['echeance_active', 'Échéance désactivée'],
  ['inscription_active', 'Inscription désactivée'],
  ['etudiant_actif', 'Étudiant désactivé'],
  ['formation_active', 'Formation désactivée'],
]

export function dependanceDesactivee(ligne) {
  const trouvee = DEPENDANCES.find(([cle]) => cle in ligne && !estActif(ligne[cle]))
  return trouvee ? trouvee[1] : null
}
