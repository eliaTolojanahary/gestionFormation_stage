// Controller de la recherche globale (barre de recherche du web et de l'application mobile).
const rechercheService = require('../services/rechercheService');

// GET /recherche?q=texte (tous les rôles) : résultats groupés par type, selon le rôle
async function rechercheController(req, res) {
  const data = await rechercheService.rechercher(req.query.q, req.user);
  res.json({ status: 'success', data });
}

module.exports = { rechercheController };
