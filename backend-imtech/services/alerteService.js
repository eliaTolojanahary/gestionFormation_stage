// Service des tâches automatiques de chaque heure (lancées par app.js) : alertes à l'Accueil,
// au formateur, et envoi automatique des attestations à la fin de la formation.
const alerteModel = require('../models/alerteModel');
const notifService = require('./notifService');
const attestationService = require('./attestationService');
const formateurNoteModel = require('../models/formateurNoteModel');
const decrochageService = require('./decrochageService');
const { salutation, titre, formation } = require('../utils/modeleEmail');
const { formatMontant } = require('../utils/format');

const { TYPES_ALERTE } = alerteModel;
const INTERVALLE_VERIFICATION_MS = 60 * 60 * 1000; // toutes les heures

const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');
const MAX_NOMS_RAPPEL = 10; // au-delà, la notification groupée donne seulement le nombre restant

const detailRappel = (e) =>
  `${e.etudiant_prenom} ${e.etudiant_nom} : ${formatMontant(e.reste_a_payer)} à régler pour ${e.formation_nom} avant le ${formatDate(e.date_echeance)}`;

// Une seule notification pour toutes les échéances passées au jaune pendant cette vérification
// (des milliers de notifications d'un coup rendraient la cloche de l'Accueil inutilisable)
function messageRappels(echeances) {
  if (echeances.length === 1) return `${detailRappel(echeances[0])}. L'étudiant doit être rappelé.`;
  const noms = echeances.slice(0, MAX_NOMS_RAPPEL).map(detailRappel).join(' ; ');
  const reste = echeances.length - MAX_NOMS_RAPPEL;
  return `${echeances.length} étudiants doivent être rappelés (page Échéances, statut J-2) : ${noms}` +
    `${reste > 0 ? ` ; et ${reste} autre(s)` : ''}.`;
}

/**
 * Chaque heure :
 *  - Accueil : « Étudiant A doit être rappelé » pour chaque échéance non soldée à J-2 ;
 *  - attestations PRÊTES (date de fin atteinte, tout payé, note attribuée) : envoyées toutes seules
 *    à l'étudiant, dès le jour de fin (ou dès qu'elles deviennent prêtes), l'Accueil en est prévenu ;
 *  - formation terminée sans note de présentation : le formateur est prévenu ;
 *  - à partir de J-2 avant la fin : l'étudiant doit commenter son formateur pour avoir son attestation
 *    (relancé chaque jour tant qu'il ne l'a pas fait) ; l'Accueil est prévenu que l'attestation l'attend ;
 *  - étudiant passé « à contacter » (risque de décrochage) : l'Accueil est prévenu.
 * Chaque alerte n'est envoyée qu'une seule fois (table alerte_envoyee) ; pour le décrochage, une fois
 * par épisode : l'alerte est oubliée quand l'étudiant revient à la normale.
 */
async function verifierAlertes() {
  const aRappeler = [];
  for (const e of await alerteModel.getEcheancesARappeler()) {
    // reserverAlerte renvoie false si cette alerte a déjà été envoyée : on passe à la suivante
    if (await alerteModel.reserverAlerte(TYPES_ALERTE.ECHEANCE_J2, e.id_echeance)) aRappeler.push(e);
  }
  if (aRappeler.length) await notifService.notifierPersonnel(messageRappels(aRappeler));

  const commentairesDemandes = await demanderCommentaires();
  const { attestations, notesDemandees } = await verifierAttestations();
  const decrochages = await signalerDecrochages();
  return { rappels: aRappeler.length, commentairesDemandes, attestations, notesDemandees, decrochages };
}

// Étudiants passés « à contacter » depuis la dernière vérification : une notification groupée à l'Accueil.
// Les alertes des étudiants qui ne sont plus « à contacter » sont oubliées : s'ils rechutent, l'Accueil
// sera de nouveau prévenu.
async function signalerDecrochages() {
  const aContacter = (await decrochageService.listerEtudiantsARisque())
    .filter((i) => i.niveau === decrochageService.NIVEAUX.A_CONTACTER);
  await alerteModel.oublierAlertesSauf(TYPES_ALERTE.DECROCHAGE, aContacter.map((i) => i.id_inscription));

  const nouveaux = [];
  for (const i of aContacter) {
    if (await alerteModel.reserverAlerte(TYPES_ALERTE.DECROCHAGE, i.id_inscription)) nouveaux.push(i);
  }
  if (nouveaux.length) await notifService.notifierPersonnel(messageDecrochages(nouveaux));
  return nouveaux.length;
}

function messageDecrochages(inscriptions) {
  const noms = inscriptions.slice(0, MAX_NOMS_RAPPEL).map((i) => `${i.prenom} ${i.nom} (${i.formation_nom})`).join(', ');
  const reste = inscriptions.length - MAX_NOMS_RAPPEL;
  const debut = inscriptions.length === 1 ? '1 étudiant à contacter' : `${inscriptions.length} étudiants à contacter`;
  return `${debut}, risque de décrochage (tableau de bord) : ${noms}${reste > 0 ? ` et ${reste} autre(s)` : ''}.`;
}

const libelle = (i) => `${i.etudiant_prenom} ${i.etudiant_nom} (${i.formation_nom})`;

// La tâche horaire ne regarde que les formations terminées depuis moins de JOURS_ATTESTATIONS jours ;
// une attestation devenue prête plus tard s'envoie depuis la page Attestations de l'Accueil.
const JOURS_ATTESTATIONS = 180;

// Les relances quotidiennes du commentaire s'arrêtent JOURS_RELANCE_COMMENTAIRE jours après la fin
// (ensuite l'Accueil voit l'attestation bloquée, avec la raison, sur sa page Attestations)
const JOURS_RELANCE_COMMENTAIRE = 30;

const formatJour = (texte) => texte.split('-').reverse().join('/'); // 'AAAA-MM-JJ' -> 'JJ/MM/AAAA'

// À partir de J-2 avant la fin, tant que l'étudiant n'a pas commenté son formateur :
//  - l'étudiant est prévenu, puis relancé une fois par jour (notification mobile + e-mail) :
//    son attestation n'est envoyée qu'après son commentaire ;
//  - l'Accueil est prévenu une fois (notification groupée) : attestation bientôt prête, en attente du commentaire.
async function demanderCommentaires() {
  const inscriptions = await formateurNoteModel.getInscriptionsARappeler(JOURS_RELANCE_COMMENTAIRE);
  let demandes = 0;
  const aSignaler = [];
  for (const i of inscriptions) {
    const envoi = await alerteModel.reserverAlerteDuJour(TYPES_ALERTE.COMMENTAIRE_FORMATEUR, i.id_inscription);
    if (envoi) {
      await notifService.notifierEtudiant(messageCommentaire(i, envoi === 'relance'));
      demandes += 1;
    }
    if (await alerteModel.reserverAlerte(TYPES_ALERTE.ATTESTATION_PROCHE, i.id_inscription)) aSignaler.push(i);
  }
  if (aSignaler.length) await notifService.notifierPersonnel(messageAttestationsProches(aSignaler));
  return demandes;
}

// Message à l'étudiant : première demande (J-2) ou relance des jours suivants
function messageCommentaire(i, relance) {
  const formateur = `${i.formateur_prenom} ${i.formateur_nom}`;
  const fin = formatJour(i.date_fin);
  return {
    id_utilisateur: i.id_utilisateur,
    email: i.email,
    message: relance
      ? `Rappel : votre attestation de ${i.formation_nom} attend votre commentaire sur votre formateur, ${formateur}. Commentez-le dans l'application (onglet Formations) pour la recevoir.`
      : `Votre formation ${i.formation_nom} se termine le ${fin} : commentez votre formateur, ${formateur}, dans l'application (onglet Formations). C'est obligatoire pour recevoir votre attestation.`,
    sujet: relance
      ? `Imteaching Formation — Votre attestation attend votre commentaire : ${i.formation_nom}`
      : `Imteaching Formation — Votre avis sur la formation : ${i.formation_nom}`,
    contenuHtml: `${titre(relance ? 'Votre attestation vous attend' : 'Votre avis nous intéresse')}
      ${salutation(i.prenom, i.nom)}
      <p>${relance
        ? `Votre attestation de la formation ${formation(i.formation_nom)} est <strong>en attente de votre commentaire</strong>.`
        : `Votre formation ${formation(i.formation_nom)} se termine le <strong>${fin}</strong>.`}
      Merci de <strong>commenter votre formateur</strong>, ${formateur}, depuis l'application mobile
      (onglet Formations).</p>
      <p>Ce commentaire est <strong>obligatoire</strong> pour recevoir votre attestation : elle vous est
      envoyée dès qu'il est écrit (et la formation terminée). Il est lu par l'Accueil et la direction,
      pas par le formateur.</p>`,
  };
}

function messageAttestationsProches(inscriptions) {
  // Formation déjà terminée (serveur éteint à J-2, ou commentaire jamais écrit) : « terminée le »
  const aujourdhui = new Date().toLocaleDateString('sv-SE'); // 'AAAA-MM-JJ' en heure locale
  const detail = (i) =>
    `${i.prenom} ${i.nom} (${i.formation_nom}, ${i.date_fin < aujourdhui ? 'terminée' : 'fin'} le ${formatJour(i.date_fin)})`;
  if (inscriptions.length === 1) {
    return `${detail(inscriptions[0])} va bientôt recevoir son attestation : en attente de son commentaire sur le formateur.`;
  }
  const noms = inscriptions.slice(0, MAX_NOMS_RAPPEL).map(detail).join(', ');
  const reste = inscriptions.length - MAX_NOMS_RAPPEL;
  return `${inscriptions.length} étudiants vont bientôt recevoir leur attestation, en attente de leur commentaire ` +
    `sur le formateur : ${noms}${reste > 0 ? ` et ${reste} autre(s)` : ''}.`;
}

// Fins de formation : envoi des attestations prêtes et notes de présentation manquantes
async function verifierAttestations() {
  const options = { depuisJours: JOURS_ATTESTATIONS };
  const { pretes, bloquees } = await attestationService.listerAttestations(options);
  let attestations = 0;

  if (pretes.length) {
    const { envoyees } = await attestationService.envoyerPretes(options);
    if (envoyees.length) {
      await notifService.notifierPersonnel(
        `${envoyees.length} attestation(s) envoyée(s) automatiquement : ${envoyees.map((e) => `${e.nom} (${e.formation_nom})`).join(', ')}.`
      );
    }
    attestations = envoyees.length;
  }

  // Note manquante : un seul message par formateur, avec tous ses étudiants concernés
  const parFormateur = new Map();
  for (const i of bloquees) {
    if (i.note_presentation !== null && i.note_presentation !== undefined) continue;
    if (!(await alerteModel.reserverAlerte(TYPES_ALERTE.NOTE_MANQUANTE, i.id_inscription))) continue;
    parFormateur.set(i.id_formateur, [...(parFormateur.get(i.id_formateur) || []), i]);
  }
  for (const [idFormateur, inscriptions] of parFormateur) {
    await notifService.notifierInApp(
      idFormateur,
      `Formation terminée : attribuez la note de présentation (sur 10) de ${inscriptions.map(libelle).join(', ')} ` +
      "pour que l'accueil puisse envoyer leur attestation."
    );
  }

  return { attestations, notesDemandees: [...parFormateur.values()].flat().length };
}

// Une vérification à la fois (l'envoi des attestations peut durer plus d'une heure) ;
// une erreur (base indisponible...) est seulement journalisée : elle ne doit pas arrêter le serveur
let verificationEnCours = false;
async function verifierSansPlanter() {
  if (verificationEnCours) return;
  verificationEnCours = true;
  try {
    const { rappels, attestations, notesDemandees, decrochages } = await verifierAlertes();
    if (rappels || attestations || notesDemandees || decrochages) {
      console.log(`Tâches automatiques : ${rappels} rappel(s), ${attestations} attestation(s), ${notesDemandees} note(s) demandée(s), ${decrochages} étudiant(s) à contacter.`);
    }
  } catch (error) {
    console.error('Vérification des alertes échouée :', error.message);
  } finally {
    verificationEnCours = false;
  }
}

// Lancé au démarrage du serveur puis toutes les heures
function demarrerAlertesAutomatiques() {
  verifierSansPlanter();
  const minuterie = setInterval(verifierSansPlanter, INTERVALLE_VERIFICATION_MS);
  minuterie.unref(); // n'empêche pas le processus de s'arrêter
  return minuterie;
}

module.exports = { verifierAlertes, messageRappels, messageDecrochages, messageAttestationsProches, demarrerAlertesAutomatiques };
