// Controller des documents : PDF générés (fiche, facture, attestation) et
// documents administratifs uploadés.
const documentService = require('../services/documentService');
const { badRequest } = require('../utils/errors');

// POST /fiche/:id_inscription/generer : fiche d'inscription PDF
async function genererFiche(req, res) {
  const cheminRelatif = await documentService.creerFiche(req.params.id_inscription);
  res.json({ status: 'success', message: 'Fiche générée.', fichier: cheminRelatif });
}

// POST /factures/:id_paiement/generer : facture PDF d'un paiement
async function genererFacture(req, res) {
  const resultat = await documentService.creerFacture(req.params.id_paiement);
  res.json({
    status: 'success', message: 'Facture générée.',
    fichier: resultat.cheminRelatif, numero_facture: resultat.numeroFacture,
  });
}

// POST /attestations/:id_inscription/generer : attestation PDF avec QR code de vérification
async function genererAttestation(req, res) {
  const resultat = await documentService.creerAttestation(req.params.id_inscription);
  res.json({
    status: 'success', message: 'Attestation générée.',
    fichier: resultat.cheminRelatif, uuid_verification: resultat.uuid,
  });
}

// POST /attestations/:id_inscription/envoyer : génère l'attestation puis l'envoie à l'étudiant
async function envoyerAttestationController(req, res) {
  const resultat = await documentService.envoyerAttestation(req.params.id_inscription);
  res.json({
    status: 'success',
    message: resultat.emailEnvoye
      ? "Attestation générée et envoyée à l'étudiant (notification et e-mail)."
      : "Attestation générée et notification envoyée, mais l'e-mail n'a pas pu partir.",
    emailEnvoye: resultat.emailEnvoye,
    fichier: resultat.cheminRelatif, uuid_verification: resultat.uuid,
  });
}

// GET /verification/:uuid (public) : page ouverte en scannant le QR code de l'attestation
async function verifierDocumentController(req, res) {
  const attestation = await documentService.verifierAuthenticite(req.params.uuid);
  res.json({
    status: 'success',
    message: 'Document authentique',
    formation: attestation.formation_nom,
    date_delivrance: attestation.date_delivrance,
  });
}

// POST /documents : upload d'un ou plusieurs documents administratifs (10 max)
async function creerDocument(req, res) {
  const fichiers = req.files || (req.file ? [req.file] : []);
  if (fichiers.length === 0) throw badRequest("Aucun fichier n'a été fourni.");

  const ids = [];
  for (const fichier of fichiers) {
    ids.push(await documentService.creerDocument(req.user.id, fichier.originalname, `documents/${fichier.filename}`));
  }

  res.status(201).json({ status: 'success', message: `${ids.length} document(s) créé(s).`, ids });
}

// GET /documents
async function obtenirDocuments(req, res) {
  const documents = await documentService.obtenirDocuments();
  res.json({ status: 'success', documents });
}

// DELETE /documents/:id (Super Admin)
async function supprimerDocumentController(req, res) {
  await documentService.supprimerDocument(req.params.id);
  res.json({ status: 'success', message: 'Document supprimé.' });
}

module.exports = { genererFiche, genererFacture, genererAttestation, envoyerAttestationController, creerDocument, obtenirDocuments, verifierDocumentController, supprimerDocumentController };
