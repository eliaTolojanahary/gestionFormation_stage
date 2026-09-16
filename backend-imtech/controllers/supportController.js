const supportService= require('../services/supportService');
async function listerSupportsFormationController(req, res) {
  try {
    const idFormation = req.params.id || req.params.id_formation;

    if (!idFormation) {
      return res.status(400).json({
        status: "error",
        message: "L'identifiant de la formation est requis."
      });
    }

    const supports = await supportService.listerSupportsFormation(idFormation);

    return res.json({ status: "success", data: supports });

  } catch (error) {
    console.error("Erreur listerSupportsFormationController :", error);
    return res.status(500).json({
      status: "error",
      message: "Erreur serveur."
    });
  }
}

async function creerSupportController(req, res) {
  try {
    const body = req.body || {};
    const { id_formation, titre } = body;
    const id_utilisateur = req.user?.id_utilisateur || req.user?.id || body.id_utilisateur;

    if (!id_formation) {
      return res.status(400).json({
        status: "error",
        message: "id_formation est requis."
      });
    }

    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Aucun fichier n'a été fourni."
      });
    }

    // Construction des chemins, style "supports/xxx.png"
    const supportsCrees = [];

    for (const file of files) {
      const cheminFichier = `supports/${file.filename}`;    // 👈 file, pas files[0]
      const titreSupport = titre?.trim() || file.originalname;

      const id_support = await supportService.creerSupport({
        id_formation,
        id_utilisateur,
        titre: titreSupport,
        fichier: cheminFichier,
      });

      supportsCrees.push(id_support);
    }

    return res.status(201).json({
      status: "success",
      message: `${supportsCrees.length} support(s) créé(s).`,
      ids: supportsCrees
    });

  } catch (error) {
    console.error("Erreur creerSupportController :", error);
    return res.status(500).json({
      status: "error",
      message: "Erreur serveur lors de la création du support."
    });
  }
}
async function deleteSupportController(req, res) {
  try {
    const ok = await supportService.supprimerSupport(req.params.id);
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