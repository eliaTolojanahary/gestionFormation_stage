// Service du classement et des notes d'attestation.
//
// Note d'attestation sur 20 :
//   paiement      : 5 si régulier (aucune échéance payée en retard), sinon 2
// + présence      : 2 si moins de la moitié des jours, 3 à partir de la moitié,
//                   5 si présent jusqu'à 2 semaines avant la fin
//   = note système sur 10 (enregistrée dans inscription.note_suggeree)
// + présentation  : 0 à 10, note libre du formateur (inscription.note_presentation)
const classementModel = require('../models/classementModel');
const formationModel = require('../models/formationModel');
const { ROLES } = require('../config/roles');
const { badRequest, forbidden, notFound } = require('../utils/errors');

const POINTS_PAIEMENT = Object.freeze({ REGULIER: 5, IRREGULIER: 2 });
const POINTS_PRESENCE = Object.freeze({ MOINS_DE_LA_MOITIE: 2, MOITIE: 3, JUSQU_A_LA_FIN: 5 });
const NOTE_PRESENTATION_MAX = 10;
// « Présent jusqu'à la fin » : présent tous les jours de cours jusqu'à 2 semaines avant la fin
const JOURS_TOLERES_AVANT_FIN = 14;

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

// Points de présence selon les jours présents et les jours de cours de la formation
function pointsPresence(nbPresences, joursRequis, joursJusquAvantFin) {
  if (nbPresences >= joursJusquAvantFin) return POINTS_PRESENCE.JUSQU_A_LA_FIN;
  if (nbPresences >= joursRequis / 2) return POINTS_PRESENCE.MOITIE;
  return POINTS_PRESENCE.MOINS_DE_LA_MOITIE;
}

/**
 * Calcule la note système (sur 10) de chaque étudiant et les classe (fonction pure, testée).
 * Ordre : note système, puis nombre de présences. Des étudiants à égalité partagent le même rang.
 */
function calculerClassement(etudiants) {
  const evalues = etudiants.map((e) => {
    const dureeJours = Number(e.duree_jours);
    const nbPresences = Number(e.nb_presences);
    const joursRequis = joursOuvres(e.date_debut, dureeJours);
    const joursJusquAvantFin = joursOuvres(e.date_debut, Math.max(dureeJours - JOURS_TOLERES_AVANT_FIN, 0));

    const paiementRegulier = Number(e.nb_echeances_en_retard) === 0;
    const points_paiement = paiementRegulier ? POINTS_PAIEMENT.REGULIER : POINTS_PAIEMENT.IRREGULIER;
    const points_presence = pointsPresence(nbPresences, joursRequis, joursJusquAvantFin);
    const note_suggeree = points_paiement + points_presence;
    const note_presentation = e.note_presentation === null || e.note_presentation === undefined
      ? null
      : Number(e.note_presentation);

    return {
      ...e,
      nb_presences: nbPresences,
      jours_requis: joursRequis,
      jours_jusqu_avant_fin: joursJusquAvantFin,
      paiement_regulier: paiementRegulier,
      points_paiement,
      points_presence,
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
async function definirNote(id_inscription, note, auteur) {
  const inscription = await classementModel.getInscriptionAvecFormateur(id_inscription);
  if (!inscription) throw notFound('Inscription introuvable.');
  if (auteur.role === ROLES.FORMATEUR && Number(inscription.id_formateur) !== Number(auteur.id)) {
    throw forbidden('Cette formation ne vous est pas attribuée.');
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
  POINTS_PAIEMENT,
  POINTS_PRESENCE,
  NOTE_PRESENTATION_MAX,
  joursOuvres,
  calculerClassement,
  actualiserClassement,
  classementFormation,
  definirNote,
};
