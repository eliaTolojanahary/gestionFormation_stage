const supportService= require('../services/supportService');

async function listerSupportsFormationController(req, res) {
  try {
    const supports = await supportService.listerSupportsFormation(req.params.id);
    return res.json({ status: "success", data: supports });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function creerSupportController(req, res) {
  try {
    const { id_formation, titre, fichier } = req.body;
    const id_utilisateur = req.user.id;

    if (!id_formation  || !titre) {
      return res.status(400).json({ status: "error", message: "id_formation et titre sont requis." });
    }

    const id_support = await supportService.creerSupport({ id_formation, id_utilisateur, titre, fichier });
    return res.status(201).json({ status: "success", message: "Support créé.", id_support });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function deleteSupportController(req, res) {
  try {
    const ok = await supportService.deleteSupport(req.params.id);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Support introuvable." });
    }
    return res.json({ status: "success", message: "Support supprimé." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

module.exports = { listerSupportsFormationController, creerSupportController, deleteSupportController };