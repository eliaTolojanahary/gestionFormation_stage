const commentaireService = require('../services/commentaireService');

async function listerCommentaires(req, res) {
  try {
    const commentaires = await commentaireService.listerCommentaires(req.params.id);
    return res.json({ status: "success", data: commentaires });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function creerCommentaireController(req, res) {
  try {
    const { id_support, contenu, mentions } = req.body;
    const id_etudiant = await commentaireService.recupererIdEtudiant(req.user.id);

    if (!id_etudiant) {
      return res.status(403).json({ status: "error", message: "Seul un étudiant peut commenter." });
    }
    if (!id_support || !contenu) {
      return res.status(400).json({ status: "error", message: "id_support et contenu sont requis." });
    }

    const id_commentaire = await commentaireService.creerCommentaire({ id_support, id_etudiant, contenu, mentions });
    return res.status(201).json({ status: "success", message: "Commentaire ajouté.", id_commentaire });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function deleteCommentaireControler(req, res) {
  try {
    const ok = await commentaireService.supprimerCommentaire(req.params.id);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Commentaire introuvable." });
    }
    return res.json({ status: "success", message: "Commentaire supprimé." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

module.exports = { listerCommentaires, creerCommentaireController, deleteCommentaireControler };