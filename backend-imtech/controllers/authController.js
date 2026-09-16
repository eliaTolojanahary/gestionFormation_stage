const authService = require('../services/authService');
const userService= require('../services/utilisateurService');
const { envoyerEmail } = require('../utils/mailer');
async function login(req, res) {
  try {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({ status: "error", message: "Email et mot de passe requis." });
    }

    const resultat = await authService.authentifier(email, mot_de_passe);
    if (!resultat) {
      return res.status(401).json({ status: "error", message: "Identifiants incorrects." });
    }

    return res.json({ status: "success", message: "Connexion réussie", ...resultat });

  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur lors de la connexion." });
  }
}

async function getProfil(req, res) {
  try {
    const user = await authService.recupererProfil(req.user.id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "Utilisateur introuvable." });
    }
    return res.json({ status: "success", user });
  } catch (error) {
    console.error("Erreur lors de la récupération du profil :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function forgotPasswordController(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: "error", message: "Email requis." });
    }

    const resetRequest = await userService.demanderReinitialisation(email);
    if (resetRequest) {
      await envoyerEmail({
        to: resetRequest.email,
        subject: 'Réinitialisation de votre mot de passe IMTECH INFO',
        html: `<p>Bonjour ${resetRequest.prenom || ''},</p><p>Votre code de réinitialisation est :</p><p><strong>${resetRequest.token}</strong></p><p>Ce code expire dans 30 minutes.</p>`,
      });
    }
    return res.json({
      status: "success",
      message: "Si cet email existe, un code de réinitialisation a été envoyé."
    });
  } catch (error) {
    console.error("Erreur forgotPasswordController:", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function resetPasswordController(req, res) {
  try {
    const { token, nouveau_mot_de_passe } = req.body;
    if (!token || !nouveau_mot_de_passe) {
      return res.status(400).json({ status: "error", message: "token et nouveau_mot_de_passe sont requis." });
    }

    const ok = await userService.reinitialiserMotDePasse(token, nouveau_mot_de_passe);
    if (!ok) {
      return res.status(400).json({ status: "error", message: "Token invalide ou expiré." });
    }
    return res.json({ status: "success", message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    console.error("Erreur resetPasswordController:", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function logout(req, res) {
  return res.json({
    status: "success",
    message: "Déconnexion réussie. Supprimez le token côté client."
  });
}

module.exports = { login, getProfil, resetPasswordController,forgotPasswordController,logout };