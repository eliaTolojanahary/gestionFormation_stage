const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail, findUserById,createResetToken,findValidResetToken,marquerTokenUtilise,updatePassword } = require('../models/userModel');

async function login(req, res) {
  try {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({ status: "error", message: "Email et mot de passe requis." });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ status: "error", message: "Identifiants incorrects." });
    }

    const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!isMatch) {
      return res.status(401).json({ status: "error", message: "Identifiants incorrects." });
    }

    const token = jwt.sign(
      { id: user.id_utilisateur, role: user.role_nom },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      status: "success",
      message: "Connexion réussie",
      token,
      user: {
        id: user.id_utilisateur,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role_nom
      }
    });

  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur lors de la connexion." });
  }
}

async function getProfil(req, res) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "Utilisateur introuvable." });
    }
    return res.json({ status: "success", user });
  } catch (error) {
    console.error("Erreur lors de la récupération du profil :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}
async function logout(req, res) {
  return res.json({
    status: "success",
    message: "Déconnexion réussie. Supprimez le token côté client."
  });
}


async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ status: "error", message: "Email requis." });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.json({
        status: "success",
        message: "Si cet email existe, un lien de réinitialisation a été envoyé."
      });
    }

    const token = await createResetToken(user.id_utilisateur);

    return res.json({
      status: "success",
      message: "Si cet email existe, un lien de réinitialisation a été envoyé.",
      debug_token: token //  temporaire, à retirer une fois Nodemailer branché
    });

  } catch (error) {
    console.error("Erreur forgot-password :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}
async function resetPassword(req, res) {
  try {
    const { token, nouveau_mot_de_passe } = req.body;

    if (!token || !nouveau_mot_de_passe) {
      return res.status(400).json({
        status: "error",
        message: "token et nouveau_mot_de_passe sont requis."
      });
    }

    const resetEntry = await findValidResetToken(token);

    if (!resetEntry) {
      return res.status(400).json({
        status: "error",
        message: "Token invalide ou expiré."
      });
    }

    await updatePassword(resetEntry.id_utilisateur, nouveau_mot_de_passe);
    await marquerTokenUtilise(resetEntry.id_reset);

    return res.json({
      status: "success",
      message: "Mot de passe réinitialisé avec succès."
    });

  } catch (error) {
    console.error("Erreur reset-password :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}


module.exports = { login, getProfil, logout, forgotPassword,resetPassword };

