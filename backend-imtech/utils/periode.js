// Filtre de période des états (tableau de bord, avis sur les formateurs) :
// ?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ, bornes incluses, chacune facultative.
const { badRequest } = require('./errors');

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Lit et contrôle les bornes de la requête ; une borne absente vaut null (pas de limite)
function lirePeriode(query = {}) {
  const debut = query.debut || null;
  const fin = query.fin || null;
  for (const date of [debut, fin]) {
    if (date && (!FORMAT_DATE.test(date) || Number.isNaN(Date.parse(date)))) {
      throw badRequest('Période invalide : dates attendues au format AAAA-MM-JJ.');
    }
  }
  if (debut && fin && debut > fin) {
    throw badRequest('Période invalide : la date de début est après la date de fin.');
  }
  return { debut, fin };
}

// Condition SQL « colonne dans la période » (fin incluse : jusqu'au lendemain minuit exclu).
// À utiliser avec paramsPeriode(), qui donne les 4 valeurs dans le même ordre.
function conditionPeriode(colonne) {
  return `(? IS NULL OR ${colonne} >= ?) AND (? IS NULL OR ${colonne} < DATE_ADD(?, INTERVAL 1 DAY))`;
}

function paramsPeriode({ debut = null, fin = null } = {}) {
  return [debut, debut, fin, fin];
}

module.exports = { lirePeriode, conditionPeriode, paramsPeriode };
