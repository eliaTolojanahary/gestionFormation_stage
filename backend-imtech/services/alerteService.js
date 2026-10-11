// Service des alertes automatiques envoyées à l'Accueil (tâche périodique lancée par app.js).
const alerteModel = require('../models/alerteModel');
const notifService = require('./notifService');

const { TYPES_ALERTE } = alerteModel;
const INTERVALLE_VERIFICATION_MS = 60 * 60 * 1000; // toutes les heures

const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');
const formatMontant = (montant) => Number(montant).toLocaleString('fr-FR');

/**
 * Prévient l'Accueil (notification in-app) :
 *  - « Étudiant A doit être rappelé » pour chaque échéance non soldée à J-2 ;
 *  - « Étudiant A a fini sa formation, envoyez-lui son attestation ».
 * C'est ensuite l'Accueil qui envoie lui-même le rappel ou l'attestation à l'étudiant.
 * Chaque alerte n'est envoyée qu'une seule fois (table alerte_envoyee).
 */
async function verifierAlertes() {
  let rappels = 0;
  let finsFormation = 0;

  for (const e of await alerteModel.getEcheancesARappeler()) {
    // reserverAlerte renvoie false si cette alerte a déjà été envoyée : on passe à la suivante
    if (!(await alerteModel.reserverAlerte(TYPES_ALERTE.ECHEANCE_J2, e.id_echeance))) continue;
    await notifService.notifierPersonnel(
      `${e.etudiant_prenom} ${e.etudiant_nom} doit être rappelé : ${formatMontant(e.reste_a_payer)} MGA ` +
      `à régler pour ${e.formation_nom} avant le ${formatDate(e.date_echeance)}.`
    );
    rappels += 1;
  }

  for (const i of await alerteModel.getFormationsTerminees()) {
    if (!(await alerteModel.reserverAlerte(TYPES_ALERTE.FIN_FORMATION, i.id_inscription))) continue;
    await notifService.notifierPersonnel(
      `${i.etudiant_prenom} ${i.etudiant_nom} a fini sa formation ${i.formation_nom}, envoyez-lui son attestation.`
    );
    finsFormation += 1;
  }

  return { rappels, finsFormation };
}

// Une erreur (base indisponible...) est seulement journalisée : elle ne doit pas arrêter le serveur
async function verifierSansPlanter() {
  try {
    const { rappels, finsFormation } = await verifierAlertes();
    if (rappels || finsFormation) {
      console.log(`🔔 Alertes envoyées à l'accueil : ${rappels} rappel(s), ${finsFormation} fin(s) de formation.`);
    }
  } catch (error) {
    console.error('❌ Vérification des alertes échouée :', error.message);
  }
}

// Lancé au démarrage du serveur puis toutes les heures
function demarrerAlertesAutomatiques() {
  verifierSansPlanter();
  const minuterie = setInterval(verifierSansPlanter, INTERVALLE_VERIFICATION_MS);
  minuterie.unref(); // n'empêche pas le processus de s'arrêter
  return minuterie;
}

module.exports = { verifierAlertes, demarrerAlertesAutomatiques };
