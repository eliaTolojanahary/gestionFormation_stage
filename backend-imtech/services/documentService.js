const crypto = require('crypto');
const documentModel = require('../models/documentModel');
const { genererFichePDF, genererFacturePDF, genererAttestationPDF } = require('../utils/pdf');
const { genererQRCodeBuffer } = require('../utils/qrcode');

const URL_BASE = process.env.URL_BASE || 'http://localhost:3000';

async function creerFiche(id_inscription) {
  const donnees = await documentModel.findInscriptionPourFiche(id_inscription);
  if (!donnees) return null;

  const nomFichier = `fiche_${id_inscription}_${Date.now()}.pdf`;
  return await genererFichePDF(donnees, nomFichier);
}

async function creerFacture(id_paiement) {
  const donnees = await documentModel.findPaiementPourFacture(id_paiement);
  if (!donnees) return null;

  const numeroFacture = `FAC-${new Date().getFullYear()}-${String(id_paiement).padStart(4, '0')}`;
  const nomFichier = `facture_${id_paiement}_${Date.now()}.pdf`;
  const cheminRelatif = await genererFacturePDF({ ...donnees, numero_facture: numeroFacture }, nomFichier);

  await documentModel.insertFacture(id_paiement, numeroFacture, cheminRelatif);
  return { cheminRelatif, numeroFacture };
}

async function creerAttestation(id_inscription) {
  const donnees = await documentModel.findInscriptionPourAttestation(id_inscription);
  if (!donnees) return null;

  const uuid = crypto.randomUUID();
  const dateDelivrance = new Date().toISOString().split('T')[0];
  const urlVerification = `${URL_BASE}/verification/${uuid}`;

  const qrBuffer = await genererQRCodeBuffer(urlVerification);
  const nomFichier = `attestation_${id_inscription}_${Date.now()}.pdf`;
  const cheminRelatif = await genererAttestationPDF({ ...donnees, date_delivrance: dateDelivrance }, qrBuffer, nomFichier);

  await documentModel.insertAttestation(id_inscription, uuid, dateDelivrance, cheminRelatif);
  return { cheminRelatif, uuid };
}

async function verifierAuthenticite(uuid) {
  return await documentModel.findAttestationParUuid(uuid);
}
async function creerDocument(id_utilisateur, nom_document, fichier) {
  return await documentModel.insertDocument(
    id_utilisateur,
    nom_document,
    fichier
  );
}

async function obtenirDocuments() {
  return await documentModel.getDocuments();
}

async function supprimerDocument(id) {
  return await documentModel.deleteDocument(id);
}
module.exports = { creerFiche, creerFacture, creerAttestation, verifierAuthenticite,
  creerDocument,
obtenirDocuments,supprimerDocument
 };