// Service des documents : génération des PDF (fiche, facture, attestation),
// vérification d'authenticité et documents administratifs uploadés.
const crypto = require('crypto');
const path = require('path');
const documentModel = require('../models/documentModel');
const { genererFichePDF, genererFacturePDF, genererAttestationPDF } = require('../utils/pdf');
const { genererQRCodeBuffer } = require('../utils/qrcode');
const { STATUTS_PAIEMENT } = require('../models/paiementModel');
const notifService = require('./notifService');
const classementService = require('./classementService');
const { notFound, conflict } = require('../utils/errors');

const DOSSIER_UPLOADS = path.join(__dirname, '..', 'uploads');

// Adresse publique de l'API, utilisée dans le lien du QR code des attestations
const URL_BASE = process.env.URL_BASE || 'http://localhost:3000/api';

// Génère la fiche d'inscription PDF et renvoie son chemin relatif
async function creerFiche(id_inscription) {
  const donnees = await documentModel.findInscriptionPourFiche(id_inscription);
  if (!donnees) throw notFound('Inscription introuvable.');

  const nomFichier = `fiche_${id_inscription}_${Date.now()}.pdf`;
  return await genererFichePDF(donnees, nomFichier);
}

// Génère la facture d'un paiement VALIDÉ (numéro FAC-<année>-<id sur 4 chiffres>)
// et l'enregistre dans la table facture
async function creerFacture(id_paiement) {
  const donnees = await documentModel.findPaiementPourFacture(id_paiement);
  if (!donnees) throw notFound('Paiement introuvable.');
  if (donnees.statut !== STATUTS_PAIEMENT.VALIDE) {
    throw conflict("Ce paiement n'est pas encore validé : impossible d'émettre une facture.");
  }

  const numeroFacture = `FAC-${new Date().getFullYear()}-${String(id_paiement).padStart(4, '0')}`;
  const nomFichier = `facture_${id_paiement}_${Date.now()}.pdf`;
  const cheminRelatif = await genererFacturePDF({ ...donnees, numero_facture: numeroFacture }, nomFichier);

  await documentModel.insertFacture(id_paiement, numeroFacture, cheminRelatif);
  return { cheminRelatif, numeroFacture };
}

// Génère l'attestation : un UUID aléatoire identifie le document, et le QR code pointe vers
// /verification/<uuid> pour que n'importe qui puisse vérifier qu'elle est authentique
async function creerAttestation(id_inscription) {
  const inscription = await documentModel.findInscriptionPourAttestation(id_inscription);
  if (!inscription) throw notFound('Inscription introuvable.');

  // Note à jour : on recalcule la note système juste avant d'imprimer l'attestation
  await classementService.actualiserClassement(inscription.id_formation);
  const donnees = await documentModel.findInscriptionPourAttestation(id_inscription);
  if (donnees.note_presentation === null) {
    throw conflict("Le formateur n'a pas encore attribué la note de présentation (sur 10) : impossible d'émettre l'attestation.");
  }

  const uuid = crypto.randomUUID();
  const dateDelivrance = new Date().toISOString().split('T')[0];
  const urlVerification = `${URL_BASE}/verification/${uuid}`;

  const qrBuffer = await genererQRCodeBuffer(urlVerification);
  const nomFichier = `attestation_${id_inscription}_${Date.now()}.pdf`;
  const cheminRelatif = await genererAttestationPDF({ ...donnees, date_delivrance: dateDelivrance }, qrBuffer, nomFichier);

  await documentModel.insertAttestation(id_inscription, uuid, dateDelivrance, cheminRelatif);
  return { cheminRelatif, uuid };
}

// Génère l'attestation puis l'envoie à l'étudiant : notification in-app + e-mail avec le PDF
async function envoyerAttestation(id_inscription) {
  const { cheminRelatif, uuid } = await creerAttestation(id_inscription);
  const donnees = await documentModel.findInscriptionPourAttestation(id_inscription);

  const { emailEnvoye } = await notifService.notifierEtudiant({
    id_utilisateur: donnees.id_utilisateur,
    email: donnees.email,
    message: `Votre attestation de la formation ${donnees.formation_nom} est disponible. Elle vous a été envoyée par e-mail.`,
    sujet: 'Votre attestation de formation IMTECH INFO',
    contenuHtml: `<p>Bonjour ${donnees.prenom},</p>
      <p>Félicitations ! Vous avez terminé la formation <strong>${donnees.formation_nom}</strong>.</p>
      <p>Vous trouverez votre attestation en pièce jointe.</p>`,
    pieceJointe: {
      chemin: path.join(DOSSIER_UPLOADS, cheminRelatif),
      nom: `attestation_${donnees.prenom}_${donnees.nom}.pdf`.replace(/\s+/g, '_'),
    },
  });

  return { cheminRelatif, uuid, emailEnvoye };
}

// Retrouve l'attestation correspondant à l'UUID du QR code ; 404 si elle n'existe pas (faux document)
async function verifierAuthenticite(uuid) {
  const rows = await documentModel.findAttestationParUuid(uuid);
  if (!rows || rows.length === 0) throw notFound('Document non reconnu.');
  return rows[0];
}

// ─── Documents administratifs uploadés ──────

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
  const ok = await documentModel.deleteDocument(id);
  if (!ok) throw notFound('Document introuvable.');
}

module.exports = {
  creerFiche, creerFacture, creerAttestation, envoyerAttestation, verifierAuthenticite,
  creerDocument, obtenirDocuments, supprimerDocument,
};