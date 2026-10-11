// Service des réactions sur les supports et de l'avis des étudiants sur les formateurs.
const reactionModel = require('../models/reactionModel');
const supportModel = require('../models/supportModel');
const { badRequest, notFound } = require('../utils/errors');

// Avis sur un formateur, calculé à partir des réactions reçues sur ses supports :
//   positives = 👍 + ❤️ + 💡, négatives = 👎, taux = positives / total.
// En dessous de AVIS_MINIMUM réactions, on ne conclut pas (trop peu d'avis).
const AVIS_MINIMUM = 5;
const TAUX_COMPETENT = 0.6; // au moins 60 % de réactions positives
const AVIS = Object.freeze({
  COMPETENT: 'competent',
  NON_COMPETENT: 'non_competent',
  PAS_ASSEZ: 'pas_assez_avis',
});

async function listerReactionsSupport(id_support) {
  return reactionModel.getReactionsBySupport(id_support);
}

// `type` : nom du type ('like', 'coeur', 'utile', 'dislike') ou, pour les anciens clients, son id
async function ajouterOuModifReaction(id_support, id_utilisateur, { nom, id }) {
  if (!nom && !id) throw badRequest('Le type de réaction est requis.');
  const type = await reactionModel.getTypeReaction({ nom, id });
  if (!type) throw badRequest('Type de réaction inconnu.');

  // On ne réagit qu'à un support publié (pas à un brouillon programmé)
  if (!(await supportModel.getSupportById(id_support))) throw notFound('Support introuvable.');

  return await reactionModel.ajouterOuModifierReaction(id_support, id_utilisateur, type.id_type_reaction);
}

async function supprimerReaction(id_support, id_utilisateur) {
  return await reactionModel.deleteReaction(id_support, id_utilisateur);
}

/**
 * Évalue chaque formateur selon les réactions reçues (fonction pure, testée).
 * Tri : compétents d'abord, puis non compétents, puis pas assez d'avis ; à avis égal, meilleur taux.
 */
function evaluerFormateurs(lignes) {
  const ordreAvis = { [AVIS.COMPETENT]: 0, [AVIS.NON_COMPETENT]: 1, [AVIS.PAS_ASSEZ]: 2 };

  return lignes
    .map((f) => {
      const compte = (cle) => Number(f[cle]) || 0;
      const positives = compte('nb_like') + compte('nb_coeur') + compte('nb_utile');
      const negatives = compte('nb_dislike');
      const total = positives + negatives;
      const taux = total === 0 ? null : Math.round((positives / total) * 100);

      let avis = AVIS.PAS_ASSEZ;
      if (total >= AVIS_MINIMUM) avis = positives / total >= TAUX_COMPETENT ? AVIS.COMPETENT : AVIS.NON_COMPETENT;

      return {
        ...f,
        nb_supports: compte('nb_supports'),
        nb_like: compte('nb_like'),
        nb_coeur: compte('nb_coeur'),
        nb_utile: compte('nb_utile'),
        nb_dislike: negatives,
        positives,
        negatives,
        total_reactions: total,
        taux_positif: taux,
        avis,
      };
    })
    .sort((a, b) =>
      ordreAvis[a.avis] - ordreAvis[b.avis] ||
      (b.taux_positif ?? -1) - (a.taux_positif ?? -1) ||
      b.total_reactions - a.total_reactions
    );
}

async function avisFormateurs() {
  return evaluerFormateurs(await reactionModel.getReactionsParFormateur());
}

module.exports = {
  AVIS,
  AVIS_MINIMUM,
  TAUX_COMPETENT,
  supprimerReaction,
  ajouterOuModifReaction,
  listerReactionsSupport,
  evaluerFormateurs,
  avisFormateurs,
};
