// Service du classement et des notes d'attestation.
//
// Note d'attestation sur 20 = note système sur 10 + présentation sur 10 (note libre du formateur).
//
// Note système : tout le monde part de 10, on retire des points (jamais sous 0) :
//   présence (jours présents / jours de cours) : ≥ 90 % → 0 · 75–90 % → −1 · 50–75 % → −2 · < 50 % → −4
//   paiement, pour chaque échéance (payée le jour de l'échéance → 0) :
//     payée en retard (soldée le jour suivant) → −1 · non réglée (pas soldée le jour suivant) → −2
//     au plus −4 en tout
//   enregistrée dans inscription.note_suggeree
//
// Exemple : présence 80 % (−1), une échéance payée en retard (−1) → 10 − 1 − 1 = 8 ;
//   avec une présentation à 7/10, la note d'attestation est 15/20.
const classementModel = require('../models/classementModel');
const documentModel = require('../models/documentModel');
const formationModel = require('../models/formationModel');
const dependanceService = require('./dependanceService');
const { ROLES } = require('../config/roles');
const { badRequest, conflict, forbidden, notFound } = require('../utils/errors');

const NOTE_SYSTEME_MAX = 10;
// Taux de présence minimal (en %) -> points retirés, du meilleur palier au moins bon
const MALUS_PRESENCE = Object.freeze([
  { tauxMin: 90, points: 0 },
  { tauxMin: 75, points: -1 },
  { tauxMin: 50, points: -2 },
  { tauxMin: 0, points: -4 },
]);
const MALUS_PAIEMENT = Object.freeze({ PAYEE_EN_RETARD: -1, NON_REGLEE: -2, PLAFOND: -4 });
const NOTE_PRESENTATION_MAX = 10;
const UN_JOUR_MS = 24 * 60 * 60 * 1000;

// Nombre de jours de cours (lundi à vendredi) parmi les `nbJours` jours qui commencent à `debut`.
// Les week-ends sont comptés sur les vraies dates : 90 jours ne font pas toujours le même nombre de week-ends.
function joursOuvres(debut, nbJours) {
  const premier = new Date(debut);
  let total = 0;
  for (let i = 0; i < nbJours; i++) {
    const jour = new Date(premier.getFullYear(), premier.getMonth(), premier.getDate() + i).getDay();
    if (jour !== 0 && jour !== 6) total++;
  }
  return total;
}

// Jours de la formation déjà écoulés (aujourd'hui compris), au plus sa durée :
// une formation en cours n'est jugée que sur les jours de cours déjà passés
function joursEcoules(debut, dureeJours, aujourdhui) {
  const d = new Date(debut);
  const premier = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const jour = Date.UTC(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
  return Math.min(dureeJours, Math.max(0, Math.floor((jour - premier) / UN_JOUR_MS) + 1));
}

function malusPresence(taux) {
  return MALUS_PRESENCE.find((palier) => taux >= palier.tauxMin).points;
}

function malusPaiement(nbPayeesEnRetard, nbNonReglees) {
  const total = nbPayeesEnRetard * MALUS_PAIEMENT.PAYEE_EN_RETARD + nbNonReglees * MALUS_PAIEMENT.NON_REGLEE;
  return Math.max(MALUS_PAIEMENT.PLAFOND, total) || 0; // 0 × −1 donnerait −0
}

/**
 * Calcule la note système (sur 10) de chaque étudiant et les classe (fonction pure, testée).
 * Ordre : note système, puis nombre de présences. Des étudiants à égalité partagent le même rang.
 */
function calculerClassement(etudiants, aujourdhui = new Date()) {
  const evalues = etudiants.map((e) => {
    const nbPresences = Number(e.nb_presences);
    const joursRequis = joursOuvres(e.date_debut, joursEcoules(e.date_debut, Number(e.duree_jours), aujourdhui));
    // Aucun jour de cours encore passé : rien à reprocher
    const tauxPresence = joursRequis ? Math.min(100, Math.round((nbPresences / joursRequis) * 100)) : 100;

    const nbPayeesEnRetard = Number(e.nb_payees_en_retard ?? 0);
    const nbNonReglees = Number(e.nb_non_reglees ?? 0);
    const points_presence = malusPresence(tauxPresence);
    const points_paiement = malusPaiement(nbPayeesEnRetard, nbNonReglees);
    const note_suggeree = Math.max(0, NOTE_SYSTEME_MAX + points_presence + points_paiement);
    const note_presentation = e.note_presentation === null || e.note_presentation === undefined
      ? null
      : Number(e.note_presentation);

    return {
      ...e,
      nb_presences: nbPresences,
      jours_requis: joursRequis,
      taux_presence: tauxPresence,
      nb_payees_en_retard: nbPayeesEnRetard,
      nb_non_reglees: nbNonReglees,
      paiement_regulier: nbPayeesEnRetard === 0 && nbNonReglees === 0,
      points_presence,
      points_paiement,
      note_suggeree,
      note_presentation,
      // Note finale connue seulement quand le formateur a noté la présentation
      note_finale: note_presentation === null ? null : note_suggeree + note_presentation,
    };
  });

  const meilleurQue = (a, b) =>
    a.note_suggeree > b.note_suggeree ||
    (a.note_suggeree === b.note_suggeree && a.nb_presences > b.nb_presences);

  return evalues
    .map((e) => ({ ...e, rang: 1 + evalues.filter((autre) => meilleurQue(autre, e)).length }))
    .sort((a, b) => a.rang - b.rang || `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
}

// La formation doit exister ; un formateur n'a accès qu'à ses propres formations
async function verifierAccesFormation(id_formation, auteur) {
  const formation = await formationModel.getFormationById(id_formation);
  if (!formation) throw notFound('Formation introuvable.');
  if (auteur?.role === ROLES.FORMATEUR && Number(formation.id_utilisateur) !== Number(auteur.id)) {
    throw forbidden('Cette formation ne vous est pas attribuée.');
  }
  return formation;
}

// Recalcule le classement d'une formation et enregistre les notes suggérées en base
async function actualiserClassement(id_formation) {
  const classement = calculerClassement(await classementModel.getActiviteFormation(id_formation));
  await classementModel.enregistrerSuggestions(classement);
  return classement;
}

async function classementFormation(id_formation, auteur) {
  await verifierAccesFormation(id_formation, auteur);
  return await actualiserClassement(id_formation);
}

// Le formateur (de cette formation) ou le Super Admin note la présentation, sur 10.
// `note` vide ou null : on efface la note de présentation.
// Une attestation délivrée imprime la note : elle ne change plus ensuite.
async function definirNote(id_inscription, note, auteur) {
  await dependanceService.verifierInscription(id_inscription);
  const inscription = await classementModel.getInscriptionAvecFormateur(id_inscription);
  if (!inscription) throw notFound('Inscription introuvable.');
  if (auteur.role === ROLES.FORMATEUR && Number(inscription.id_formateur) !== Number(auteur.id)) {
    throw forbidden('Cette formation ne vous est pas attribuée.');
  }
  if (await documentModel.findAttestation(id_inscription)) {
    throw conflict("L'attestation a déjà été délivrée : cette note ne peut plus être modifiée.");
  }

  let valeur = null;
  if (note !== null && note !== undefined && String(note).trim() !== '') {
    // Accepte "7,5" comme "7.5", puis arrondit à 2 décimales
    valeur = Number(String(note).replace(',', '.'));
    if (!Number.isFinite(valeur) || valeur < 0 || valeur > NOTE_PRESENTATION_MAX) {
      throw badRequest(
        `Vous devez attribuer une note de ${NOTE_PRESENTATION_MAX} au maximum : ` +
        `les ${NOTE_PRESENTATION_MAX} autres points sont calculés par le système (paiement et présence).`
      );
    }
    valeur = Math.round(valeur * 100) / 100;
  }

  await classementModel.setNotePresentation(id_inscription, valeur);
  return { id_inscription: Number(id_inscription), note_presentation: valeur };
}

module.exports = {
  MALUS_PRESENCE,
  MALUS_PAIEMENT,
  NOTE_PRESENTATION_MAX,
  joursOuvres,
  calculerClassement,
  actualiserClassement,
  classementFormation,
  definirNote,
};
