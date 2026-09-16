
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
async function creerDocument(req, res) {
  try {
    const id_utilisateur = req.user?.id_utilisateur || req.user?.id || req.body?.id_utilisateur;

    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Aucun fichier n'a été fourni."
      });
    }

    // Construction des chemins, style "etudiants/xxx.png"
    const documentsCrees = [];

    for (const file of files) {
      const cheminFichier = `documents/${file.filename}`;   // 👈 file, pas files[0]

      const id_document = await documentService.creerDocument(
        id_utilisateur,
        file.originalname,
        cheminFichier             // chemin relatif
      );

      documentsCrees.push(id_document);
    }

    return res.status(201).json({
      status: "success",
      message: `${documentsCrees.length} document(s) créé(s).`,
      ids: documentsCrees
    });

  } catch (error) {
    console.error("Erreur creerDocument :", error);
    return res.status(500).json({
      status: "error",
      message: "Erreur serveur lors de la création du document."
    });
  }
}
async function obtenirDocuments(req, res) {
  try {
    const documents = await documentService.obtenirDocuments();

    return res.json({
      status: "success",
      documents
    });

  } catch (error) {
    console.error("Erreur obtenirDocuments :", error);
    return res.status(500).json({
      status: "error",
      message: "Erreur serveur."
    });
  }
}

async function supprimerDocumentController(req, res) {
  try {
    const ok = await documentService.supprimerDocument(req.params.id);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "doc introuvable." });
    }
    return res.json({ status: "success", message: "doc désactivé." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

module.exports = { genererFiche, genererFacture, genererAttestation, creerDocument,obtenirDocuments,verifierDocumentController,supprimerDocumentController };