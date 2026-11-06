// Filtre « actif / désactivé » des listes (?etat=actif|inactif|tous).
// Les suppressions sont logiques (colonne etat) : un élément désactivé peut être réactivé.

const ETATS = ['actif', 'inactif', 'tous'];

// État demandé dans la query string ; 'actif' par défaut, et toujours 'actif' si l'auteur
// n'a pas le droit de voir les éléments désactivés (étudiant, formateur)
function lireEtat(query = {}, autorise = true) {
  return autorise && ETATS.includes(query.etat) ? query.etat : 'actif';
}

// Condition SQL sur la colonne etat (null pour 'tous' : pas de condition)
function conditionEtat(colonne, etat = 'actif') {
  if (etat === 'tous') return null;
  return `${colonne} = ${etat === 'inactif' ? 'false' : 'true'}`;
}

module.exports = { ETATS, lireEtat, conditionEtat };
