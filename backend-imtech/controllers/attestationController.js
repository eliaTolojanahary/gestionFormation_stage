// Controller des attestations de fin de formation (prêtes, envoi groupé).
const attestationService = require('../services/attestationService');

// GET /attestations/pretes : { pretes, bloquees (avec raisons) }
async function listerAttestationsController(req, res) {
  const { pretes, bloquees } = await attestationService.listerAttestations();
  res.json({ status: 'success', data: { pretes, bloquees } });
}

// POST /attestations/envoyer-pretes : envoie toutes les attestations prêtes
async function envoyerPretesController(req, res) {
  const { envoyees, echecs } = await attestationService.envoyerPretes();
  res.json({
    status: 'success',
    message: `${envoyees.length} attestation(s) envoyée(s)` + (echecs.length ? `, ${echecs.length} en échec.` : '.'),
    data: { envoyees, echecs },
  });
}

module.exports = { listerAttestationsController, envoyerPretesController };
