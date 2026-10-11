// Limite simple du nombre de requêtes par adresse IP (en mémoire), pour les routes publiques
// sensibles comme l'inscription en ligne : évite la création de comptes en masse.
const { AppError } = require('../utils/errors');

function limiteRequetes({ max, fenetreMs, message }) {
  const appelsParIp = new Map();

  return (req, res, next) => {
    const maintenant = Date.now();
    const ip = req.ip || 'inconnue';
    const recents = (appelsParIp.get(ip) || []).filter((t) => maintenant - t < fenetreMs);

    if (recents.length >= max) {
      appelsParIp.set(ip, recents);
      throw new AppError(429, message);
    }
    recents.push(maintenant);
    appelsParIp.set(ip, recents);
    next();
  };
}

module.exports = { limiteRequetes };
