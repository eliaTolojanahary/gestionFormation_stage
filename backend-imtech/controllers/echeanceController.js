const echeanceService = require('../services/echeanceService');

async function getEcheancesByInscriptionController(req, res) {
  try {
    const echeances = await echeanceService.listerEcheancesInscription(req.params.id);
    return res.json({ status: "success", data: echeances });
  } catch (error) {
    console.error("Erreur getEcheancesByInscription :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function listerEcheances(req, res) {
  try {
    const echeances = await echeanceService.listerToutesEcheances();
    return res.json({ status: "success", data: echeances });
  } catch (error) {
    console.error("Erreur getAllEcheances :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function updateEcheanceController(req, res) {
  try {
    const ok = await echeanceService.modifierEcheance(req.params.id, req.body);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Échéance non trouvée." });
    }
    return res.json({ status: "success", message: "Échéance mise à jour." });
  } catch (error) {
    console.error("Erreur updateEcheance :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

module.exports = { updateEcheanceController, listerEcheances, getEcheancesByInscriptionController };