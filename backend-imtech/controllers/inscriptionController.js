const inscriptionService = require('../services/inscriptionService');

async function creerInscriptionController(req, res) {
  try {
    const { id_etudiant, id_formation, nombre_tranches, id_tranche } = req.body;

    if (!id_etudiant || !id_formation || !nombre_tranches || !id_tranche) {
      return res.status(400).json({
        status: "error",
        message: "id_etudiant, id_formation, nombre_tranches et id_tranche sont requis."
      });
    }

    const id_inscription = await inscriptionService.creerInscription({ id_etudiant, id_formation, nombre_tranches, id_tranche });

    return res.status(201).json({
      status: "success",
      message: "Inscription créée et échéancier généré automatiquement.",
      id_inscription
    });

  } catch (error) {
   console.error("Erreur création inscription :", error);
return res.status(500).json({ status: "error", message: error.message });
  }
}
async function validerInscriptionController(req, res) {
  try {
    const { id_mode_paiement, reference_virement } = req.body;

    if (!id_mode_paiement) {
      return res.status(400).json({ status: 'error', message: 'id_mode_paiement est requis.' });
    }

    const result = await inscriptionService.validerInscription(
      req.params.id,
      id_mode_paiement,
      reference_virement
    );

    return res.json({ status: 'success', message: 'Inscription validée et premier paiement enregistré.', data: result });
  } catch (error) {
    console.error('Erreur validation inscription :', error);

    if (error.message === 'Aucune échéance trouvée pour cette inscription.') {
      return res.status(409).json({ status: 'error', message: error.message });
    }

    return res.status(500).json({ status: 'error', message: 'Erreur serveur.' });
  }
}

async function listerInscriptions(req, res) {
  try {
    const inscriptions = await inscriptionService.listerInscriptions();
    return res.json({ status: "success", data: inscriptions });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function detailInscription(req, res) {
  try {
    const inscription = await inscriptionService.recupererInscription(req.params.id);
    if (!inscription) {
      return res.status(404).json({ status: "error", message: "Inscription introuvable." });
    }
    return res.json({ status: "success", data: inscription });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function deleteInscriptionController(req, res) {
  try {
    const ok = await inscriptionService.supprimerInscription(req.params.id);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Inscription introuvable." });
    }
    return res.json({ status: "success", message: "Inscription désactivée." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

module.exports = { creerInscriptionController, validerInscriptionController, deleteInscriptionController, detailInscription, listerInscriptions };