const {
  creerInscription,
  findInscriptionAvecTarif,
  genererEcheancierTx,
  enregistrerPaiement,
  validerInscription
} = require('../models/inscriptionModel');


async function creerInscriptionController(req, res) {
  try {
    const { id_etudiant, id_formation, nombre_tranches, id_tranche } = req.body;

    if (!id_etudiant || !id_formation || !nombre_tranches || !id_tranche) {
      return res.status(400).json({
        status: "error",
        message: "id_etudiant, id_formation, nombre_tranches et id_tranche sont requis."
      });
    }

    const id_inscription = await creerInscription(id_etudiant, id_formation);

    const inscription = await findInscriptionAvecTarif(id_inscription);

    await genererEcheancierTx({
      id_inscription,
      tarifTotal: parseFloat(inscription.tarif),
      dureeJours: inscription.duree_jours,
      nombreTranches: parseInt(nombre_tranches, 10),
      idTranche: id_tranche
    });

    return res.status(201).json({
      status: "success",
      message: "Inscription créée et échéancier généré automatiquement.",
      id_inscription
    });

  } catch (error) {
    console.error("Erreur création inscription :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur lors de l'inscription." });
  }
}


async function validerInscriptionController(req, res) {
  try {
    const { id_inscription } = req.params;
    const ok = await validerInscription(id_inscription);

    if (!ok) {
      return res.status(404).json({ status: "error", message: "Inscription introuvable." });
    }

    return res.json({ status: "success", message: "Inscription validée." });

  } catch (error) {
    console.error("Erreur validation inscription :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function enregistrerPaiementController(req, res) {
  try {
    const { id_echeance, id_mode_paiement, montant, reference_virement } = req.body;

    if (!id_echeance || !id_mode_paiement || !montant) {
      return res.status(400).json({
        status: "error",
        message: "id_echeance, id_mode_paiement et montant sont requis."
      });
    }

    const id_paiement = await enregistrerPaiement({
      id_echeance, id_mode_paiement, montant, reference_virement
    });

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
module.exports = { creerInscriptionController, enregistrerPaiementController,validerInscriptionController };