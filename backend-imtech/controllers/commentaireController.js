// Controller des commentaires sur les supports de cours.
const commentaireService = require('../services/commentaireService');

// GET /supports/:id/commentaires : commentaires principaux, chacun avec `reponses` et `nb_reponses`
async function listerCommentaires(req, res) {
  const commentaires = await commentaireService.listerCommentairesParSupport(req.params.id);
  res.json({ status: 'success', data: commentaires });
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
  creerCommentaireController,
  deleteCommentaireController,
};
