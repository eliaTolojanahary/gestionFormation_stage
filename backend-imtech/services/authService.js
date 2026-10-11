// Service d'authentification : connexion (JWT + session en base), profil, mot de passe.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const etudiantModel = require('../models/etudiantModel');
const { ROLES } = require('../config/roles');
const { notFound, badRequest } = require('../utils/errors');

// Durée de vie d'une connexion : le JWT et la session expirent en même temps.
const DUREE_SESSION_HEURES = 24;

// Vérifie email + mot de passe ; renvoie { token, user } ou null si les identifiants sont faux
// (même réponse pour un email inconnu ou un mauvais mot de passe).
async function authentifier(email, mot_de_passe, { userAgent, ip }) {
  const user = await userModel.findUserByEmail(email);
  if (!user) return null;

  // Comparaison avec le hash bcrypt stocké en base
  const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
  if (!isMatch) return null;

  // Pour un étudiant, l'id_etudiant est placé dans le token (évite une requête à chaque appel)
  const id_etudiant = user.role_nom === ROLES.ETUDIANT
    ? await etudiantModel.getIdEtudiantByUtilisateur(user.id_utilisateur)
    : null;

  const token = jwt.sign(
    { id: user.id_utilisateur, role: user.role_nom, id_etudiant },
    process.env.JWT_SECRET,
    { expiresIn: `${DUREE_SESSION_HEURES}h` }
  );

  // Session enregistrée en base : permet la déconnexion à distance et la liste des appareils
  const expireLe = new Date(Date.now() + DUREE_SESSION_HEURES * 60 * 60 * 1000);
  await userModel.createSession(user.id_utilisateur, token, userAgent, ip, expireLe);

  return {
    token,
    user: {
      id: user.id_utilisateur,
      id_utilisateur: user.id_utilisateur,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
      id_role: user.id_role,
      role: user.role_nom,
      photo: user.photo,
      id_etudiant,
    },
  };
}

async function recupererProfil(id) {
  const user = await userModel.findUserById(id);
  if (!user) throw notFound('Utilisateur introuvable.');
  return user;
}

// Change le mot de passe puis déconnecte les autres appareils (la session courante est conservée).
async function changerMotDePasse(idUtilisateur, ancienMotDePasse, nouveauMotDePasse, tokenCourant) {
  const user = await userModel.findUserWithPassword(idUtilisateur);
  if (!user) throw notFound('Utilisateur introuvable.');

  const match = await bcrypt.compare(ancienMotDePasse, user.mot_de_passe);
  if (!match) throw badRequest('Ancien mot de passe incorrect.');

  const hash = await bcrypt.hash(nouveauMotDePasse, 10);
  await userModel.updatePasswordHash(idUtilisateur, hash);
  await userModel.deactivateAllExcept(idUtilisateur, tokenCourant);
}

// Désactive la session : le token devient inutilisable même s'il n'a pas encore expiré
async function deconnecter(token) {
  await userModel.deactivateSession(token);
}

module.exports = { authentifier, recupererProfil, changerMotDePasse, deconnecter };
