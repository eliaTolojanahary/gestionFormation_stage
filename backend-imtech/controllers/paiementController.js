const paiementService = require('../services/paiementService');
async function enregistrerPaiementController(req, res) {
  try {
    const { id_echeance, id_mode_paiement, montant, reference_virement } = req.body;

    if (!id_echeance || !id_mode_paiement || !montant) {
      return res.status(400).json({
        status: "error",
        message: "id_echeance, id_mode_paiement et montant sont requis."
      });
    }

    const id_paiement = await paiementService.enregistrerPaiement(
      id_echeance, id_mode_paiement, montant, reference_virement
    );

    return res.status(201).json({
      status: "success",
      message: "Paiement enregistré.",
      id_paiement
    });

  } catch (error) {
    console.error("Erreur enregistrement paiement :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur lors du paiement." });
  }
}


async function getPaiementByIdController(req, res) {
  try {
    const { id } = req.params;
    const paiement = await paiementService.listerPaiementId(id);
    if (!paiement) {
      return res.status(404).json({ status: "error", message: "Paiement non trouvé." });
    }
    return res.json({ status: "success", data: paiement });
  } catch (error) {
    console.error("Erreur getPaiementById :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}


async function updatePaiementController(req, res) {
  try {
    const { id } = req.params;
    const ok = await paiementService.modifierPaiement(id, req.body);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Paiement non trouvé." });
    }
    return res.json({ status: "success", message: "Paiement mis à jour." });
  } catch (error) {
    console.error("Erreur updatePaiement :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}


module.exports = { enregistrerPaiementController,updatePaiementController,getPaiementByIdController};