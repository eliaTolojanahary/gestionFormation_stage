// Controller des commentaires sur les supports de cours.
const commentaireService = require('../services/commentaireService');
const { lireCurseur, reponseCurseur } = require('../utils/pagination');

// Réponse commune aux deux fils : commentaires principaux, chacun avec `reponses` et `nb_reponses`.
// ?limite=5&avant=<id_commentaire> : une page + { curseur, total_echanges } ; sinon tout le fil.
async function repondreFil(req, res, cible) {
  const curseur = lireCurseur(req.query);
  const fil = await commentaireService.listerFil(cible, curseur);
  if (!curseur) return res.json({ status: 'success', data: fil.lignes });
  res.json(reponseCurseur(fil, curseur, 'id_commentaire'));
}

// GET /supports/:id/commentaires
async function listerCommentaires(req, res) {
  await repondreFil(req, res, { id_support: req.params.id });
}

// GET /formations/:id/commentaires : commentaires de tous les supports publiés de la formation
// (chacun avec `titre_support`), en une requête au lieu d'un appel par support
async function listerCommentairesFormation(req, res) {
  await repondreFil(req, res, { id_formation: req.params.id });
}

// POST /commentaires : `mentions` = id_etudiant des étudiants mentionnés (@) dans le commentaire,
// `id_parent` (facultatif) = commentaire auquel on répond
async function creerCommentaireController(req, res) {
  const { id_support, id_parent, contenu, mentions } = req.body;
  const commentaire = await commentaireService.creerCommentaire(
    { idSupport: id_support, idParent: id_parent, contenu, mentions },
    req.user
  );
  res.status(201).json({ status: 'success', message: 'Commentaire ajouté.', commentaire });
}

// DELETE /commentaires/:id
async function deleteCommentaireController(req, res) {
  await commentaireService.supprimerCommentaire(req.params.id, req.user);
  res.json({ status: 'success', message: 'Commentaire supprimé.' });
}

module.exports = {
  listerCommentaires,
  listerCommentairesFormation,
  creerCommentaireController,
  deleteCommentaireController,
};
