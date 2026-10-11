// Controller des réactions (j'aime, etc.) sur les supports de cours.
const reactionService = require('../services/reactionService');
const { notFound } = require('../utils/errors');

// GET /supports/:id/reactions
async function listerReactionsSupportController(req, res) {
  const reactions = await reactionService.listerReactionsSupport(req.params.id);
  res.json({ status: 'success', data: reactions });
}

// POST /supports/:id/reactions { type_reaction: 'like' | 'coeur' | 'utile' | 'dislike' }
// (id_type_reaction accepté pour les anciens clients) : une seule réaction par utilisateur, remplacée si elle existe
async function reagir(req, res) {
  await reactionService.ajouterOuModifReaction(req.params.id, req.user.id, {
    nom: req.body.type_reaction,
    id: req.body.id_type_reaction,
  });
  res.status(201).json({ status: 'success', message: 'Réaction enregistrée.' });
}

// DELETE /supports/:id/reactions : retire la réaction de l'utilisateur connecté
async function retirerReaction(req, res) {
  const ok = await reactionService.supprimerReaction(req.params.id, req.user.id);
  if (!ok) throw notFound('Aucune réaction à retirer.');
  res.json({ status: 'success', message: 'Réaction retirée.' });
}

// GET /formateurs/avis : formateurs classés selon les réactions reçues sur leurs supports
async function avisFormateursController(req, res) {
  const formateurs = await reactionService.avisFormateurs();
  res.json({ status: 'success', data: formateurs });
}

module.exports = { listerReactionsSupportController, reagir, retirerReaction, avisFormateursController };
