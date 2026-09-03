const bcrypt = require('bcrypt');
const {
  findAllUsers,
  findUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../models/userModel');

async function getAllUsers(req, res) {
  try {
    const users = await findAllUsers();
    return res.json({ status: "success", data: users });
  } catch (error) {
    console.error("Erreur getAllUsers:", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = await findUserById(id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "Utilisateur non trouvé." });
    }
    return res.json({ status: "success", data: user });
  } catch (error) {
    console.error("Erreur getUserById:", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function createUser(req, res) {
  try {
    const { nom, prenom, email, mot_de_passe, role } = req.body;

    if (!nom || !email || !mot_de_passe || !role) {
      return res.status(400).json({ status: "error", message: "Tous les champs requis ne sont pas remplis." });
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    const id = await createUser({ nom, prenom, email, mot_de_passe: hashedPassword, role });

    return res.status(201).json({ status: "success", message: "Utilisateur créé avec succès !", id });
  } catch (error) {
    console.error("Erreur createUserController:", error);
    return res.status(500).json({ status: "error", message: "Erreur lors de la création." });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { nom, prenom, email, role } = req.body;

    const updated = await updateUser(id, { nom, prenom, email, role });
    if (!updated) {
      return res.status(404).json({ status: "error", message: "Utilisateur introuvable." });
    }

    return res.json({ status: "success", message: "Utilisateur mis à jour !" });
  } catch (error) {
    console.error("Erreur updateUserController:", error);
    return res.status(500).json({ status: "error", message: "Erreur lors de la mise à jour." });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const deleted = await deleteUser(id);
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
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};