const reactionService = require('../services/reactionService');

async function listerReactionsSupportController(req, res) {
  try {
    const reactions = await reactionService.listerReactionsSupport(req.params.id);
    return res.json({ status: "success", data: reactions });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function reagir(req, res) {
  try {
    const { id } = req.params; // id_support
    const { id_type_reaction } = req.body;
    const id_utilisateur = req.user.id; 

    if (!id_type_reaction) {
      return res.status(400).json({ status: "error", message: "id_type_reaction requis." });
    }

    await reactionService.ajouterOuModifReaction(id, id_utilisateur, id_type_reaction);
    return res.status(201).json({ status: "success", message: "Réaction enregistrée." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function retirerReaction(req, res) {
  try {
    const { id } = req.params; // id_support
    const id_utilisateur = req.user.id;

    const ok = await reactionService.supprimerReaction(id, id_utilisateur);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Aucune réaction à retirer." });
    }
    return res.json({ status: "success", message: "Réaction retirée." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

module.exports = { listerReactionsSupportController, reagir, retirerReaction };