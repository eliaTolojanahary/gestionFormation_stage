// Controller des demandes d'assistance (étudiant -> Accueil).
const assistanceService = require('../services/assistanceService');
const { exigerChamps } = require('../utils/errors');

// POST /assistances (Étudiant)
async function creerAssistanceController(req, res) {
  exigerChamps(req.body, ['objet', 'contenu']);
  const demande = await assistanceService.creerDemande(req.body, req.user);
  res.status(201).json({ status: 'success', message: 'Demande envoyée.', data: demande });
}

// GET /assistances?statut=... : l'étudiant ne voit que ses demandes
async function listerAssistancesController(req, res) {
  const demandes = await assistanceService.listerDemandes(req.user, { statut: req.query.statut });
  res.json({ status: 'success', data: demandes });
}

// PUT /assistances/:id/resoudre (personnel)
async function resoudreAssistanceController(req, res) {
  const demande = await assistanceService.resoudreDemande(req.params.id, req.user);
  res.json({ status: 'success', message: 'Demande résolue.', data: demande });
}

module.exports = { creerAssistanceController, listerAssistancesController, resoudreAssistanceController };
