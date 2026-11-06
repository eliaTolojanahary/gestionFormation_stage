// Petit cache en mémoire pour les calculs coûteux dont le résultat est le même pour tout le monde
// (statistiques du tableau de bord, avis sur les formateurs de la vitrine publique).
// Chaque résultat est gardé `dureeMs` ; plusieurs demandes en même temps partagent le même calcul ;
// une erreur n'est pas gardée (la demande suivante recalcule).
function creerCache(dureeMs) {
  const entrees = new Map(); // clé -> { promesse, expire }

  function enCache(cle, calcul) {
    const maintenant = Date.now();
    const entree = entrees.get(cle);
    if (entree && entree.expire > maintenant) return entree.promesse;

    for (const [k, e] of entrees) if (e.expire <= maintenant) entrees.delete(k); // clés expirées oubliées
    const promesse = calcul();
    entrees.set(cle, { promesse, expire: maintenant + dureeMs });
    promesse.catch(() => entrees.delete(cle));
    return promesse;
  }

  enCache.vider = () => entrees.clear(); // pour les tests
  return enCache;
}

module.exports = { creerCache };
