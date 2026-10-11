// Limite le nombre de requêtes (en mémoire) pour les routes publiques sensibles :
// inscription en ligne (création de comptes en masse), connexion et mot de passe oublié
// (essais de mots de passe à l'infini).
const { AppError } = require('../utils/errors');

// options :
//   max, fenetreMs, message : au plus `max` requêtes comptées par `fenetreMs`, sinon 429 + message
//   cle(req)                : regroupement des essais (par défaut l'adresse IP)
//   echecsSeulement         : ne compte que les réponses en erreur (4xx / 5xx) ; une réussite
//                             remet le compteur à zéro (ex. connexion : seuls les mauvais mots de passe comptent)
function limiteRequetes({ max, fenetreMs, message, cle = (req) => req.ip || 'inconnue', echecsSeulement = false }) {
  const appels = new Map(); // clé -> horodatages des requêtes comptées

  const recents = (k, maintenant) => (appels.get(k) || []).filter((t) => maintenant - t < fenetreMs);

  // Nettoyage régulier : les clés dont tous les essais ont expiré sont oubliées (pas de fuite mémoire)
  const nettoyage = setInterval(() => {
    const maintenant = Date.now();
    for (const [k, liste] of appels) {
      const restants = liste.filter((t) => maintenant - t < fenetreMs);
      if (restants.length) appels.set(k, restants);
      else appels.delete(k);
    }
  }, fenetreMs);
  nettoyage.unref(); // n'empêche pas le serveur (ni les tests) de s'arrêter

  const middleware = (req, res, next) => {
    const maintenant = Date.now();
    const k = cle(req);
    const liste = recents(k, maintenant);

    if (liste.length >= max) {
      appels.set(k, liste);
      throw new AppError(429, message);
    }

    if (!echecsSeulement) {
      liste.push(maintenant);
      appels.set(k, liste);
    } else {
      // Compté à la fin de la réponse, selon son code
      res.on('finish', () => {
        if (res.statusCode >= 400) appels.set(k, [...recents(k, Date.now()), Date.now()]);
        else appels.delete(k);
      });
    }
    next();
  };

  middleware.reinitialiser = () => appels.clear(); // pour les tests
  return middleware;
}

module.exports = { limiteRequetes };
