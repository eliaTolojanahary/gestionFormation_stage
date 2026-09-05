const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

async function createUserController(req, res) {
  try {
    const { nom, prenom, email, mot_de_passe, telephone,id_role  } = req.body;

    if (!nom || !email || !mot_de_passe || !id_role) {
      return res.status(400).json({ status: "error", message: "Tous les champs requis ne sont pas remplis." });
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    const id = await createUser( nom, prenom, email, hashedPassword, telephone,id_role );

    return res.status(201).json({ status: "success", message: "Utilisateur créé avec succès !", id });
  } catch (error) {
    console.error("Erreur createUserController:", error);
    return res.status(500).json({ status: "error", message: "Erreur lors de la création." });
  }
}

async function updateUserController(req, res) {
  try {
    const { id } = req.params;
    const { nom, prenom, email, telephone,id_role } = req.body;

    const updated = await updateUser(id, nom, prenom, email,telephone, id_role );
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
  createUserController,
  updateUserController,
  deleteUserController
};