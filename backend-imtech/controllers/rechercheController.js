// Controller de la recherche globale (barre de recherche du tableau de bord web).
const rechercheService = require('../services/rechercheService');

// GET /recherche?q=texte (Super Admin, Accueil, Formateur) : résultats groupés par type
async function rechercheController(req, res) {
  const data = await rechercheService.rechercher(req.query.q, req.user);
  res.json({ status: 'success', data });
}

module.exports = { rechercheController };
