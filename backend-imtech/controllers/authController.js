// Controller d'authentification : connexion, profil, mots de passe et sessions.
// Les controllers lisent la requête, appellent le service et renvoient le JSON ;
// les erreurs levées sont traitées par le gestionnaire global de app.js.
const authService = require('../services/authService');
const userService = require('../services/userService');
const userModel = require('../models/userModel');
const { envoyerEmail } = require('../utils/mailer');
const { salutation } = require('../utils/modeleEmail');
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
      subject: 'IMTECH INFO — Réinitialisation de votre mot de passe',
      html: `${salutation(resetRequest.prenom, resetRequest.nom)}
        <p>Vous avez demandé la réinitialisation du mot de passe de votre compte IMTECH INFO.
        Voici votre code de vérification :</p>
        <p style="font-size:22px;font-weight:bold;letter-spacing:4px;">${resetRequest.token}</p>
        <p>Ce code est valable <strong>30 minutes</strong>.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message :
        votre mot de passe reste inchangé.</p>`,
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

  // Code refusé : erreur 400 levée par le service avec la raison précise
  await userService.reinitialiserMotDePasse(token, nouveau_mot_de_passe);

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
