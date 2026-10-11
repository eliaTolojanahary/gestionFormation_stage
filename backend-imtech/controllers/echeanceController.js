// Controller des échéances (tranches de paiement d'une inscription).
const echeanceService = require('../services/echeanceService');

// GET /inscriptions/:id/echeances : échéancier d'une inscription
async function getEcheancesByInscriptionController(req, res) {
  const echeances = await echeanceService.listerEcheancesInscription(req.params.id);
  res.json({ status: 'success', data: echeances });
}

// GET /echeances : toutes les échéances (suivi par l'Accueil)
async function listerEcheances(req, res) {
  const echeances = await echeanceService.listerToutesEcheances();
  res.json({ status: 'success', data: echeances });
}

// PUT /echeances/:id
async function updateEcheanceController(req, res) {
  await echeanceService.modifierEcheance(req.params.id, req.body);
  res.json({ status: 'success', message: 'Échéance mise à jour.' });
}

// POST /echeances/:id/rappeler : rappel manuel de l'Accueil (notification in-app + e-mail).
// La notification est toujours créée ; `emailEnvoye` indique si l'e-mail est parti.
async function rappelerEcheanceController(req, res) {
  const { emailEnvoye } = await echeanceService.rappelerEcheance(req.params.id);
  res.json({
    status: 'success',
    emailEnvoye,
    message: emailEnvoye
      ? "Rappel envoyé à l'étudiant (notification et e-mail)."
      : "Notification envoyée à l'étudiant, mais l'e-mail n'a pas pu partir.",
  });
}

module.exports = { updateEcheanceController, listerEcheances, getEcheancesByInscriptionController, rappelerEcheanceController };
