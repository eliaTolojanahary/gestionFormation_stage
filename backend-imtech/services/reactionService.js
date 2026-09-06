const reactionModel = require('../models/reactionModel');

async function listerReactionsSupport(id_support) {
  return reactionModel.getReactionsBySupport(id_support);
}

async function ajouterOuModifReaction(id_support, id_utilisateur, id_type_reaction) {
  return await reactionModel.ajouterOuModifierReaction(id_support, id_utilisateur, id_type_reaction);
}

async function supprimerReaction(id_support, id_utilisateur) {
  return await reactionModel.deleteReaction(id_support, id_utilisateur);
}


module.exports = {
  supprimerReaction, ajouterOuModifReaction, listerReactionsSupport
};