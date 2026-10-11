// Erreur métier portant un code HTTP.
// Les services la lèvent, le gestionnaire d'erreurs global (app.js) la traduit en réponse JSON.
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

// Raccourcis par code HTTP, ex. `throw notFound('Formation introuvable.')`
const badRequest = (message) => new AppError(400, message);
const unauthorized = (message = 'Authentification requise.') => new AppError(401, message);
const forbidden = (message = 'Accès refusé.') => new AppError(403, message);
const notFound = (message = 'Ressource introuvable.') => new AppError(404, message);
const conflict = (message) => new AppError(409, message);

// Vérifie la présence des champs obligatoires dans un objet (souvent req.body).
function exigerChamps(source, champs) {
  const manquants = champs.filter((champ) => {
    const valeur = source?.[champ];
    return valeur === undefined || valeur === null || String(valeur).trim() === '';
  });
  if (manquants.length > 0) {
    throw badRequest(`Champ(s) requis manquant(s) : ${manquants.join(', ')}.`);
  }
}

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict, exigerChamps };
