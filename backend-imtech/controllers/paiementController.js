// Controller des paiements. Un paiement saisi par un étudiant est "en attente"
// jusqu'à sa validation (ou son refus) par l'Accueil / le Super Admin.
const paiementService = require('../services/paiementService');
const { ROLES } = require('../config/roles');
const { exigerChamps } = require('../utils/errors');

// GET /paiements?statut=... : un étudiant ne reçoit que ses propres paiements
async function listerPaiementsController(req, res) {
  const paiements = await paiementService.listerPaiements(req.user, { statut: req.query.statut });
  res.json({ status: 'success', data: paiements });
}

// POST /paiements : paiement d'une échéance
async function enregistrerPaiementController(req, res) {
  const estEtudiant = req.user.role === ROLES.ETUDIANT;
  // Le montant d'un étudiant est imposé par le serveur, il n'est donc pas requis
  exigerChamps(req.body, estEtudiant ? ['id_echeance', 'id_mode_paiement'] : ['id_echeance', 'id_mode_paiement', 'montant']);

  const id_paiement = await paiementService.enregistrerPaiement(req.body, req.user);

  res.status(201).json({
    status: 'success',
    message: estEtudiant ? 'Paiement envoyé, en attente de validation.' : 'Paiement enregistré.',
    id_paiement,
  });
}

// GET /paiements/:id
async function getPaiementByIdController(req, res) {
  const paiement = await paiementService.recupererPaiement(req.params.id, req.user);
  res.json({ status: 'success', data: paiement });
}

// PUT /paiements/:id (personnel)
async function updatePaiementController(req, res) {
  const { id_mode_paiement, montant, reference_virement } = req.body;
  await paiementService.modifierPaiement(req.params.id, { id_mode_paiement, montant, reference_virement });
  res.json({ status: 'success', message: 'Paiement mis à jour.' });
}

// PUT /paiements/:id/valider : le paiement en attente est compté dans les sommes payées
async function validerPaiementController(req, res) {
  const paiement = await paiementService.validerPaiement(req.params.id);
  res.json({ status: 'success', message: 'Paiement validé.', data: paiement });
}

// PUT /paiements/:id/refuser
async function refuserPaiementController(req, res) {
  const paiement = await paiementService.refuserPaiement(req.params.id);
  res.json({ status: 'success', message: 'Paiement refusé.', data: paiement });
}

// GET /etudiants/:id/dashboard-paiement : récapitulatif des paiements d'un étudiant
async function dashboardPaiementEtudiantController(req, res) {
  const data = await paiementService.dashboardPaiementEtudiant(req.params.id);
  res.json({ status: 'success', data });
}

module.exports = {
  listerPaiementsController,
  enregistrerPaiementController,
  updatePaiementController,
  getPaiementByIdController,
  validerPaiementController,
  refuserPaiementController,
  dashboardPaiementEtudiantController,
};
