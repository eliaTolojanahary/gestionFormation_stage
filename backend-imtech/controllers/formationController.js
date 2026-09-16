const formationService = require('../services/formationService');

async function listerFormations(req, res) {
  try {
    const idUtilisateur = req.user?.role === 'Formateur' ? (req.user.id_utilisateur || req.user.id) : undefined;
    const formations = await formationService.listerFormations(idUtilisateur);
    return res.json({ status: "success", data: formations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function detailFormation(req, res) {
  try {
    const formation = await formationService.recupererFormation(req.params.id);
    if (!formation) {
      return res.status(404).json({ status: "error", message: "Formation introuvable." });
    }
    return res.json({ status: "success", data: formation });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function etudiantsFormation(req, res) {
  try {
    const etudiants = await formationService.recupererEtudiantsFormation(req.params.id);
    return res.json({ status: "success", data: etudiants });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function creerFormationController(req, res) {
  try {
    const { nom, description, tarif, duree, duree_jours, id_utilisateur } = req.body;

    if (!nom || !tarif || !duree_jours || !id_utilisateur) {
      return res.status(400).json({ status: "error", message: "nom, tarif, duree_jours et id_utilisateur sont requis." });
    }

    const id_formation = await formationService.creerFormation({ nom, description, tarif, duree, duree_jours, id_utilisateur });
    return res.status(201).json({ status: "success", message: "Formation créée.", id_formation });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ status: "error", message: error.message || "Erreur lors de la création." });
  }
}

async function updateFormationController(req, res) {
  try {
    const ok = await formationService.modifierFormation(req.params.id, req.body);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Formation introuvable." });
    }
    return res.json({ status: "success", message: "Formation mise à jour." });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ status: "error", message: error.message || "Erreur lors de la mise à jour." });
  }
}

async function deleteFormationController(req, res) {
  try {
    const ok = await formationService.supprimerFormation(req.params.id);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Formation introuvable." });
    }
    return res.json({ status: "success", message: "Formation désactivée." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

module.exports = { listerFormations, detailFormation, etudiantsFormation, creerFormationController, updateFormationController, deleteFormationController };