// Service des documents : génération des PDF (fiche, facture, attestation),
// vérification d'authenticité et documents administratifs uploadés.
const crypto = require('crypto');
const path = require('path');
const { ROLES } = require('../config/roles');
const documentModel = require('../models/documentModel');
const formateurNoteModel = require('../models/formateurNoteModel');
const { genererFichePDF, genererFacturePDF, genererAttestationPDF } = require('../utils/pdf');
const { genererQRCodeBuffer } = require('../utils/qrcode');
const { STATUTS_PAIEMENT } = require('../models/paiementModel');
const notifService = require('./notifService');
const classementService = require('./classementService');
const dependanceService = require('./dependanceService');
const etatService = require('./etatService');
const { notFound, conflict } = require('../utils/errors');
const { formatMontant } = require('../utils/format');
const { supprimerUpload } = require('../utils/fichiersUpload');
const echeanceModel = require('../models/echeanceModel');
const { salutation, titre, encadre, formation } = require('../utils/modeleEmail');

const DOSSIER_UPLOADS = path.join(__dirname, '..', 'uploads');

// Adresse publique de l'API, utilisée dans le lien du QR code des attestations
const URL_BASE = process.env.URL_BASE || 'http://localhost:3000/api';

// Génère la fiche d'inscription PDF et renvoie son chemin relatif
async function creerFiche(id_inscription) {
  await dependanceService.verifierInscription(id_inscription);
  const donnees = await documentModel.findInscriptionPourFiche(id_inscription);
  if (!donnees) throw notFound('Inscription introuvable.');

  const nomFichier = `fiche_${id_inscription}_${Date.now()}.pdf`;
  return await genererFichePDF(donnees, nomFichier);
}

const factureExistante = async (id_paiement) => {
  const facture = await documentModel.findFacture(id_paiement);
  return facture && { cheminRelatif: facture.fichier_pdf, numeroFacture: facture.numero_facture };
};

// Génère la facture d'un paiement VALIDÉ (numéro FAC-<année>-<id sur 4 chiffres>)
// et l'enregistre dans la table facture. Un paiement n'a qu'une facture : si elle existe déjà, on la renvoie.
async function creerFacture(id_paiement) {
  await dependanceService.verifierPaiement(id_paiement);
  const donnees = await documentModel.findPaiementPourFacture(id_paiement);
  if (!donnees) throw notFound('Paiement introuvable.');
  if (donnees.statut !== STATUTS_PAIEMENT.VALIDE) {
    throw conflict("Ce paiement n'est pas encore validé : impossible d'émettre une facture.");
  }
  const existante = await factureExistante(id_paiement);
  if (existante) return existante;

  const numeroFacture = `FAC-${new Date().getFullYear()}-${String(id_paiement).padStart(4, '0')}`;
  const nomFichier = `facture_${id_paiement}_${Date.now()}.pdf`;
  const cheminRelatif = await genererFacturePDF({ ...donnees, numero_facture: numeroFacture }, nomFichier);

  try {
    await documentModel.insertFacture(id_paiement, numeroFacture, cheminRelatif);
  } catch (error) {
    if (error.code !== 'ER_DUP_ENTRY') throw error;
    // Deux demandes simultanées : la base n'en garde qu'une, on retire le PDF de trop
    await supprimerUpload(cheminRelatif);
    return factureExistante(id_paiement);
  }
  return { cheminRelatif, numeroFacture };
}

// Génère l'attestation : un UUID aléatoire identifie le document, et le QR code pointe vers
// /verification/<uuid> pour que n'importe qui puisse vérifier qu'elle est authentique
const dateFr = (date) => new Date(date).toLocaleDateString('fr-FR');

// Crée la facture d'un paiement validé et l'envoie à l'étudiant : notification in-app + e-mail
// avec le PDF. Appelée automatiquement à chaque validation (paiementService.envoyerFactureAuto).
// id_auteur : membre du personnel qui a validé (il signe l'e-mail).
async function envoyerFacture(id_paiement, id_auteur = null) {
  const { cheminRelatif, numeroFacture } = await creerFacture(id_paiement);
  const p = await documentModel.findPaiementPourFacture(id_paiement);
  const montant = formatMontant(p.montant);

  const { emailEnvoye } = await notifService.notifierEtudiant({
    id_utilisateur: p.id_utilisateur,
    email: p.email,
    message: `Votre paiement de ${montant} (${p.formation_nom}) a été validé. Votre facture ${numeroFacture} vous a été envoyée par e-mail.`,
    sujet: `IMTECH INFO — Facture ${numeroFacture}`,
    contenuHtml: `${titre('Confirmation de paiement')}
      ${salutation(p.prenom, p.nom)}
      <p>Nous avons bien reçu votre paiement pour la formation ${formation(p.formation_nom)}, et nous
      vous en <strong>remercions</strong> ! Il est désormais <strong>VALIDÉ</strong>.</p>
      ${encadre([
        ['Facture', numeroFacture],
        ['Formation', p.formation_nom],
        ['Montant réglé', montant],
        ['Mode de paiement', p.mode_paiement],
        ['Date du paiement', dateFr(p.date_paiement)],
        ['Reste à payer', Number(p.reste_a_payer) > 0 ? formatMontant(p.reste_a_payer) : 'Formation entièrement réglée'],
      ])}
      <p>Votre facture est jointe à ce message au format <strong>PDF</strong>. Nous vous conseillons de la
      <strong>conserver</strong> : elle fait foi de votre règlement.</p>
      <p>Vous retrouvez à tout moment vos paiements et vos prochaines échéances dans l'application
      mobile <strong>IMTECH INFO</strong>.</p>`,
    id_auteur,
    pieceJointe: {
      chemin: path.join(DOSSIER_UPLOADS, cheminRelatif),
      nom: `facture_${numeroFacture}.pdf`,
    },
  });

  return { cheminRelatif, numeroFacture, emailEnvoye };
}

const attestationExistante = async (id_inscription) => {
  const attestation = await documentModel.findAttestation(id_inscription);
  return attestation && { cheminRelatif: attestation.fichier_pdf, uuid: attestation.uuid_verification };
};

// Une inscription n'a qu'une attestation : si elle existe déjà, on la renvoie (même QR code, même note)
async function creerAttestation(id_inscription) {
  await dependanceService.verifierInscription(id_inscription);
  const existante = await attestationExistante(id_inscription);
  if (existante) return existante;
  if (!(await formateurNoteModel.commentaireExiste(id_inscription))) {
    throw conflict("L'étudiant doit d'abord commenter son formateur depuis l'application mobile.");
  }

  const inscription = await documentModel.findInscriptionPourAttestation(id_inscription);
  if (!inscription) throw notFound('Inscription introuvable.');

  // Note à jour : on recalcule la note système juste avant d'imprimer l'attestation
  await classementService.actualiserClassement(inscription.id_formation);
  const donnees = await documentModel.findInscriptionPourAttestation(id_inscription);
  if (donnees.note_presentation === null) {
    throw conflict("Le formateur n'a pas encore attribué la note de présentation (sur 10) : impossible d'émettre l'attestation.");
  }

  const uuid = crypto.randomUUID();
  // Date et heure locales (toISOString donnerait l'heure UTC : la veille entre 0 h et 3 h à Madagascar)
  const dateDelivrance = new Date();
  const urlVerification = `${URL_BASE}/verification/${uuid}`;

  const qrBuffer = await genererQRCodeBuffer(urlVerification);
  const nomFichier = `attestation_${id_inscription}_${Date.now()}.pdf`;
  const cheminRelatif = await genererAttestationPDF({ ...donnees, date_delivrance: dateDelivrance }, qrBuffer, nomFichier);

  try {
    await documentModel.insertAttestation(id_inscription, uuid, dateDelivrance, cheminRelatif);
  } catch (error) {
    if (error.code !== 'ER_DUP_ENTRY') throw error;
    // Deux demandes simultanées : la base n'en garde qu'une, on retire le PDF de trop
    await supprimerUpload(cheminRelatif);
    return attestationExistante(id_inscription);
  }
  return { cheminRelatif, uuid };
}

// Génère l'attestation puis l'envoie à l'étudiant : notification in-app + e-mail avec le PDF.
// id_auteur : membre du personnel qui l'envoie ; absent pour l'envoi automatique en fin de formation.
async function envoyerAttestation(id_inscription, id_auteur = null) {
  const { cheminRelatif, uuid } = await creerAttestation(id_inscription);
  const donnees = await documentModel.findInscriptionPourAttestation(id_inscription);

  const { emailEnvoye } = await notifService.notifierEtudiant({
    id_utilisateur: donnees.id_utilisateur,
    email: donnees.email,
    message: `Votre attestation de la formation ${donnees.formation_nom} est disponible. Elle vous a été envoyée par e-mail.`,
    sujet: `IMTECH INFO — Attestation de formation : ${donnees.formation_nom}`,
    contenuHtml: `${titre('Votre attestation de formation')}
      ${salutation(donnees.prenom, donnees.nom)}
      <p><strong>FÉLICITATIONS !</strong> Vous avez achevé avec succès la formation
      ${formation(donnees.formation_nom)}. Toute l'équipe IMTECH INFO est fière de votre parcours.</p>
      ${encadre([
        ['Formation', donnees.formation_nom],
        ['Durée', donnees.duree],
        ['Note obtenue', donnees.note !== null && donnees.note !== undefined ? `${Number(donnees.note)} / 20` : ''],
        ['Date de délivrance', dateFr(new Date())],
      ])}
      <p>Votre <strong>attestation officielle</strong> est jointe à ce message au format PDF. Elle porte un
      <strong>QR code</strong> : tout employeur peut le scanner pour vérifier son authenticité.</p>
      <p>Nous vous souhaitons une <strong>pleine réussite</strong> dans la suite de votre parcours, et serons
      heureux de vous accueillir à nouveau pour une prochaine formation !</p>`,
    id_auteur,
    pieceJointe: {
      chemin: path.join(DOSSIER_UPLOADS, cheminRelatif),
      nom: `attestation_${donnees.prenom}_${donnees.nom}.pdf`.replace(/\s+/g, '_'),
    },
  });

  return { cheminRelatif, uuid, emailEnvoye };
}

// Inscription validée : fiche d'inscription PDF créée et envoyée à l'étudiant avec la confirmation
// (notification in-app + e-mail), avec le rappel de son échéancier.
// id_auteur : membre du personnel qui a validé (il signe l'e-mail).
async function envoyerConfirmationInscription(id_inscription, id_auteur = null) {
  const cheminRelatif = await creerFiche(id_inscription);
  const donnees = await documentModel.findInscriptionPourFiche(id_inscription);
  const echeances = (await echeanceModel.getEcheancesByInscription(id_inscription)).filter((e) => e.etat);

  const echeancier = echeances
    .map((e, index) => `${index + 1}. <strong>${formatMontant(e.montant_prevu)}</strong> avant le <strong>${dateFr(e.date_echeance)}</strong>`)
    .join('<br>');

  const { emailEnvoye } = await notifService.notifierEtudiant({
    id_utilisateur: donnees.id_utilisateur,
    email: donnees.email,
    message: `Votre inscription à la formation ${donnees.formation_nom} est confirmée. Vos supports de cours sont accessibles.`,
    sujet: `IMTECH INFO — Inscription confirmée : ${donnees.formation_nom}`,
    contenuHtml: `${titre('Confirmation d\'inscription')}
      ${salutation(donnees.prenom, donnees.nom)}
      <p>Nous avons le <strong>plaisir</strong> de vous confirmer votre inscription à la formation
      ${formation(donnees.formation_nom)}. <strong>Bienvenue chez IMTECH INFO !</strong></p>
      ${encadre([
        ['Formation', donnees.formation_nom],
        ['Durée', donnees.duree],
        ["Date d'inscription", dateFr(donnees.date_inscription)],
        ['Tarif', formatMontant(donnees.tarif)],
        ['Échéancier', echeancier],
      ])}
      <p>Votre <strong>fiche d'inscription</strong> est jointe à ce message. Vos <strong>supports de cours</strong>
      sont dès à présent disponibles dans l'application mobile IMTECH INFO, où vous pourrez aussi suivre
      vos paiements. La facture de votre premier paiement vous est envoyée séparément.</p>
      <p>Nous vous souhaitons une <strong>excellente formation</strong> !</p>`,
    pieceJointe: {
      chemin: path.join(DOSSIER_UPLOADS, cheminRelatif),
      nom: `fiche_inscription_${donnees.prenom}_${donnees.nom}.pdf`.replace(/\s+/g, '_'),
    },
    id_auteur,
  });

  return { cheminRelatif, emailEnvoye };
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

async function obtenirDocuments(etat) {
  return await documentModel.getDocuments(etat);
}

// Page Documents : documents administratifs + fichiers des supports, filtrés et paginés.
// Un formateur ne voit que les supports de ses formations.
async function listerTousDocuments(filtres, pagination, auteur) {
  const portee = { ...filtres, id_formateur: auteur.role === ROLES.FORMATEUR ? auteur.id : undefined };
  if (!pagination) return { lignes: await documentModel.getTousDocuments(portee) };
  const [lignes, total] = await Promise.all([
    documentModel.getTousDocuments(portee, pagination),
    documentModel.compterTousDocuments(portee),
  ]);
  return { lignes, total };
}

async function supprimerDocument(id) {
  await etatService.desactiverDocument(id);
}

module.exports = {
  creerFiche, creerFacture, envoyerFacture, creerAttestation, envoyerAttestation, envoyerConfirmationInscription,
  verifierAuthenticite,
  creerDocument, obtenirDocuments, listerTousDocuments, supprimerDocument,
};