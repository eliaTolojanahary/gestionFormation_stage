// Controller d'authentification : connexion, profil, mots de passe et sessions.
// Les controllers lisent la requête, appellent le service et renvoient le JSON ;
// les erreurs levées sont traitées par le gestionnaire global de app.js.
const authService = require('../services/authService');
const userService = require('../services/userService');
const userModel = require('../models/userModel');
const { envoyerEmail } = require('../utils/mailer');
const { exigerChamps, badRequest, unauthorized } = require('../utils/errors');

const LONGUEUR_MIN_MOT_DE_PASSE = 8;

function verifierLongueurMotDePasse(motDePasse) {
  if (String(motDePasse).length < LONGUEUR_MIN_MOT_DE_PASSE) {
    throw badRequest(`Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`);
  }
}

// POST /auth/login : renvoie le token JWT et l'utilisateur ; l'appareil (user-agent, IP)
// est mémorisé dans la session
async function login(req, res) {
  exigerChamps(req.body, ['email', 'mot_de_passe']);
  const { email, mot_de_passe } = req.body;

  const resultat = await authService.authentifier(email, mot_de_passe, {
    userAgent: req.headers['user-agent'] || null,
    ip: req.ip || null,
  });
  if (!resultat) throw unauthorized('Identifiants incorrects.');

  res.json({ status: 'success', message: 'Connexion réussie', ...resultat });
}

// GET /auth/profil : utilisateur connecté
async function getProfil(req, res) {
  const user = await authService.recupererProfil(req.user.id);
  res.json({ status: 'success', user });
}

// POST /auth/forgot-password : envoie par email un code de réinitialisation (valable 30 min)
async function forgotPasswordController(req, res) {
  exigerChamps(req.body, ['email']);

  const resetRequest = await userService.demanderReinitialisation(req.body.email);
  if (resetRequest) {
    await envoyerEmail({
      to: resetRequest.email,
      subject: 'Réinitialisation de votre mot de passe IMTECH INFO',
      html: `<p>Bonjour ${resetRequest.prenom || ''},</p><p>Votre code de réinitialisation est :</p><p><strong>${resetRequest.token}</strong></p><p>Ce code expire dans 30 minutes.</p>`,
    });
  }
  // Réponse identique que l'email existe ou non (évite de révéler les comptes existants)
  res.json({ status: 'success', message: 'Si cet email existe, un code de réinitialisation a été envoyé.' });
}

// POST /auth/reset-password : définit un nouveau mot de passe à partir du code reçu
async function resetPasswordController(req, res) {
  exigerChamps(req.body, ['token', 'nouveau_mot_de_passe']);
  const { token, nouveau_mot_de_passe } = req.body;
  verifierLongueurMotDePasse(nouveau_mot_de_passe);

  const ok = await userService.reinitialiserMotDePasse(token, nouveau_mot_de_passe);
  if (!ok) throw badRequest('Token invalide ou expiré.');

  res.json({ status: 'success', message: 'Mot de passe réinitialisé avec succès.' });
}

// POST /auth/logout : désactive la session du token courant
async function logout(req, res) {
  await authService.deconnecter(req.token);
  res.json({ status: 'success', message: 'Déconnexion réussie.' });
}

// PUT /auth/change-password : nécessite l'ancien mot de passe
async function changePasswordController(req, res) {
  exigerChamps(req.body, ['ancien_mot_de_passe', 'nouveau_mot_de_passe']);
  const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
  verifierLongueurMotDePasse(nouveau_mot_de_passe);

  await authService.changerMotDePasse(req.user.id, ancien_mot_de_passe, nouveau_mot_de_passe, req.token);
  res.json({ status: 'success', message: 'Mot de passe modifié avec succès.' });
}

// GET /auth/sessions : appareils connectés ; `est_courante` marque celui qui fait la requête
async function getSessionsController(req, res) {
  const sessions = await userModel.findSessionsByUser(req.user.id, req.token);
  const data = sessions.map((s) => ({ ...s, actif: !!s.actif, est_courante: !!s.est_courante }));
  res.json({ status: 'success', sessions: data });
}

// GET /auth/last-login : dernière session active de l'utilisateur
async function getLastLoginController(req, res) {
  const session = await userModel.findLastActiveSession(req.user.id);
  res.json({ status: 'success', lastLogin: session });
}

// PUT /auth/logout-all : déconnecte tous les autres appareils (garde la session courante)
async function logoutAllController(req, res) {
  const affected = await userModel.deactivateAllExcept(req.user.id, req.token);
  res.json({ status: 'success', message: `${affected} session(s) déconnectée(s).` });
}

module.exports = {
  login, getProfil, logout,
  forgotPasswordController, resetPasswordController, changePasswordController,
  getSessionsController, getLastLoginController, logoutAllController,
};
