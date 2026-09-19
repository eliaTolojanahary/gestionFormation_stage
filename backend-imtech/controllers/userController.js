const userService = require('../services/userService');

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
    console.log(req.body);
    
    const { nom, prenom, email, mot_de_passe, telephone, id_role } = req.body;

    if (!nom || !email || !mot_de_passe || !id_role) {
      return res.status(400).json({ status: "error", message: "Tous les champs requis ne sont pas remplis." });
    }

    // Extraction du chemin de la photo (compatible req.file ou req.files.photo)
    let photo = null;
    if (req.file) {
      photo = `utilisateurs/${req.file.filename}`;
    } else if (req.files && req.files.photo && req.files.photo[0]) {
      photo = `utilisateurs/${req.files.photo[0].filename}`;
    }
    
    const id = await userService.creerUtilisateur({
      nom,
      prenom,
      email,
      mot_de_passe,
      telephone,
      id_role,
      photo
    });

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
    const { nom, prenom, email, telephone, id_role, mot_de_passe } = req.body;

    // Extraction du chemin de la photo
    let photo = undefined;
    if (req.file) {
      photo = `utilisateurs/${req.file.filename}`;
    } else if (req.files && req.files.photo && req.files.photo[0]) {
      photo = `utilisateurs/${req.files.photo[0].filename}`;
    }

    const updateData = {
      nom,
      prenom,
      email,
      telephone,
      id_role,
      mot_de_passe,
      ...(photo !== undefined && { photo }),
    };

    const updated = await userService.modifierUtilisateur(req.params.id, updateData);
    if (!updated) {
      return res.status(404).json({ status: "error", message: "Utilisateur introuvable." });
    }

    return res.json({ status: "success", message: "Utilisateur mis à jour !", data: updateData });
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
async function changePasswordController(req, res) {
  try {
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
    const userId = req.user.id;

    if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
      return res.status(400).json({
        status: "error",
        message: "L'ancien et le nouveau mot de passe sont requis."
      });
    }

    if (nouveau_mot_de_passe.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Le nouveau mot de passe doit contenir au moins 8 caractères."
      });
    }

    // Appel du service qui vérifie l'ancien mot de passe et fait un updateUser
    const ok = await userService.changerMotDePasse(userId, ancien_mot_de_passe, nouveau_mot_de_passe);
    
    if (!ok) {
      return res.status(400).json({
        status: "error",
        message: "Ancien mot de passe incorrect ou utilisateur introuvable."
      });
    }

    return res.json({ status: "success", message: "Mot de passe modifié avec succès." });
  } catch (error) {
    console.error("Erreur changePasswordController:", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}
module.exports = {
  getAllUsers, getUserById, createUserController, updateUserController, deleteUserController,changePasswordController
};