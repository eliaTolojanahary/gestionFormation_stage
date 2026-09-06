const documentService = require('../services/documentService');

async function genererFiche(req, res) {
  try {
    const { id_inscription } = req.params;
    const cheminRelatif = await documentService.creerFiche(id_inscription);

    if (!cheminRelatif) {
      return res.status(404).json({ status: "error", message: "Inscription introuvable." });
    }
    return res.json({ status: "success", message: "Fiche générée.", fichier: cheminRelatif });
  } catch (error) {
    console.error("Erreur genererFiche :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function genererFacture(req, res) {
  try {
    const { id_paiement } = req.params;
    const resultat = await documentService.creerFacture(id_paiement);

    if (!resultat) {
      return res.status(404).json({ status: "error", message: "Paiement introuvable." });
    }
    return res.json({
      status: "success", message: "Facture générée.",
      fichier: resultat.cheminRelatif, numero_facture: resultat.numeroFacture
    });
  } catch (error) {
    console.error("Erreur genererFacture :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function genererAttestation(req, res) {
  try {
    const { id_inscription } = req.params;
    const resultat = await documentService.creerAttestation(id_inscription);

    if (!resultat) {
      return res.status(404).json({ status: "error", message: "Inscription introuvable." });
    }
    return res.json({
      status: "success", message: "Attestation générée.",
      fichier: resultat.cheminRelatif, uuid_verification: resultat.uuid
    });
  } catch (error) {
    console.error("Erreur genererAttestation :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function verifierDocumentController(req, res) {
  try {
    const { uuid } = req.params;
    const rows = await documentService.verifierAuthenticite(uuid);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Document non reconnu." });
    }

    return res.json({
      status: "success",
      message: "Document authentique",
      formation: rows[0].formation_nom,
      date_delivrance: rows[0].date_delivrance
    });
  } catch (error) {
    console.error("Erreur verifierDocument :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

module.exports = { genererFiche, genererFacture, genererAttestation, verifierDocumentController };