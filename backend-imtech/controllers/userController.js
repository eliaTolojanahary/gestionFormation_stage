const userService = require('../services/utilisateurService');

async function getAllUsers(req, res) {
  try {
    const users = await userService.listerUtilisateurs();
    return res.json({ status: "success", data: users });
  } catch (error) {
    console.error("Erreur getAllUsers:", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function getUserById(req, res) {
  try {
    const user = await userService.recupererUtilisateur(req.params.id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "Utilisateur non trouvé." });
    }
    return res.json({ status: "success", data: user });
  } catch (error) {
    console.error("Erreur getUserById:", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function createUserController(req, res) {
  try {
    const { nom, prenom, email, mot_de_passe, telephone, id_role } = req.body;

    if (!nom || !email || !mot_de_passe || !id_role) {
      return res.status(400).json({ status: "error", message: "Tous les champs requis ne sont pas remplis." });
    }

    const id = await userService.creerUtilisateur({ nom, prenom, email, mot_de_passe, telephone, id_role });
    return res.status(201).json({ status: "success", message: "Utilisateur créé avec succès !", id });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ status: "error", message: "Cet email existe déjà." });
    }
    console.error("Erreur createUserController:", error);
    return res.status(500).json({ status: "error", message: "Erreur lors de la création." });
  }
}

async function updateUserController(req, res) {
  try {
    const { nom, prenom, email, telephone, id_role } = req.body;
    const updated = await userService.modifierUtilisateur(req.params.id, { nom, prenom, email, telephone, id_role });
    if (!updated) {
      return res.status(404).json({ status: "error", message: "Utilisateur introuvable." });
    }
    return res.json({ status: "success", message: "Utilisateur mis à jour !" });
  } catch (error) {
    console.error("Erreur updateUserController:", error);
    return res.status(500).json({ status: "error", message: "Erreur lors de la mise à jour." });
  }
}

async function deleteUserController(req, res) {
  try {
    const deleted = await userService.supprimerUtilisateur(req.params.id);
    if (!deleted) {
      return res.status(404).json({ status: "error", message: "Utilisateur introuvable." });
    }
    return res.json({ status: "success", message: "Utilisateur supprimé." });
  } catch (error) {
    console.error("Erreur deleteUserController:", error);
    return res.status(500).json({ status: "error", message: "Erreur lors de la suppression." });
  }
}

module.exports = {
  getAllUsers, getUserById, createUserController, updateUserController, deleteUserController
};