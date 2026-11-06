// Service des tâches automatiques de chaque heure (lancées par app.js) : alertes à l'Accueil,
// au formateur, et envoi automatique des attestations à la fin de la formation.
const alerteModel = require('../models/alerteModel');
const notifService = require('./notifService');
const attestationService = require('./attestationService');
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
 *  - formation terminée sans note de présentation : le formateur est prévenu.
 * Chaque alerte n'est envoyée qu'une seule fois (table alerte_envoyee).
 */
async function verifierAlertes() {
  const aRappeler = [];
  for (const e of await alerteModel.getEcheancesARappeler()) {
    // reserverAlerte renvoie false si cette alerte a déjà été envoyée : on passe à la suivante
    if (await alerteModel.reserverAlerte(TYPES_ALERTE.ECHEANCE_J2, e.id_echeance)) aRappeler.push(e);
  }
  if (aRappeler.length) await notifService.notifierPersonnel(messageRappels(aRappeler));

  const { attestations, notesDemandees } = await verifierAttestations();
  return { rappels: aRappeler.length, attestations, notesDemandees };
}

const libelle = (i) => `${i.etudiant_prenom} ${i.etudiant_nom} (${i.formation_nom})`;

// La tâche horaire ne regarde que les formations terminées depuis moins de JOURS_ATTESTATIONS jours ;
// une attestation devenue prête plus tard s'envoie depuis la page Attestations de l'Accueil.
const JOURS_ATTESTATIONS = 180;

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
    const { rappels, attestations, notesDemandees } = await verifierAlertes();
    if (rappels || attestations || notesDemandees) {
      console.log(`🔔 Tâches automatiques : ${rappels} rappel(s), ${attestations} attestation(s), ${notesDemandees} note(s) demandée(s).`);
    }
  } catch (error) {
    console.error('❌ Vérification des alertes échouée :', error.message);
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

module.exports = { verifierAlertes, messageRappels, demarrerAlertesAutomatiques };
