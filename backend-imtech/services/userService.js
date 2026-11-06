// Service des comptes utilisateurs et de la réinitialisation du mot de passe.
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userModel = require('../models/userModel');
const etatService = require('./etatService');
const { ROLES } = require('../config/roles');
const { notFound, badRequest } = require('../utils/errors');

// Durée de validité du code de réinitialisation envoyé par e-mail
const DUREE_CODE_MINUTES = 30;

// pagination { page, limite, offset } : une page + le total ; null : toute la liste
async function listerUtilisateurs(filtres = {}, pagination = null) {
  if (!pagination) return await userModel.findAllUsers(filtres);
  const [lignes, total] = await Promise.all([
    userModel.findAllUsers(filtres, pagination),
    userModel.compterUsers(filtres),
  ]);
  return { lignes, total };
}

async function recupererUtilisateur(id) {
  const user = await userModel.findUserById(id);
  if (!user) throw notFound('Utilisateur non trouvé.');
  return user;
}

// Le mot de passe est toujours stocké haché (bcrypt, coût 10), jamais en clair
async function creerUtilisateur({ nom, prenom, email, mot_de_passe, telephone, id_role, photo }) {
  const hash = await bcrypt.hash(mot_de_passe, 10);
  return await userModel.insertUser(nom, prenom, email, hash, telephone, id_role, photo);
}

// `auteur` = utilisateur connecté (req.user).
// Seul le Super Admin peut changer un rôle ou imposer un mot de passe ;
// pour les autres, ces champs sont ignorés (le changement de mot de passe passe par /auth/change-password).
async function modifierUtilisateur(id, { nom, prenom, email, telephone, id_role, photo, mot_de_passe }, auteur) {
  const estAdmin = auteur?.role === ROLES.SUPER_ADMIN;
  const mot_de_passe_hash = estAdmin && mot_de_passe ? await bcrypt.hash(mot_de_passe, 10) : undefined;

  const ok = await userModel.updateUser(id, {
    nom, prenom, email, telephone, photo,
    id_role: estAdmin ? id_role : undefined,
    mot_de_passe_hash,
  });
  if (!ok) throw notFound('Utilisateur introuvable.');

  if (mot_de_passe_hash) await userModel.deactivateAllSessions(id);
}

// Supprime le compte et coupe immédiatement toutes ses sessions
async function supprimerUtilisateur(id) {
  await etatService.desactiverUtilisateur(id);
  await userModel.deactivateAllSessions(id);
}

// Génère un code aléatoire de réinitialisation (64 caractères hexa) valable 30 minutes.
// Renvoie null si l'email est inconnu.
async function demanderReinitialisation(email) {
  const user = await userModel.findUserByEmail(email);
  if (!user) return null; // le controller renvoie un message neutre dans tous les cas

  const token = crypto.randomBytes(32).toString('hex');
  await userModel.insertResetToken(user.id_utilisateur, token, DUREE_CODE_MINUTES);
  return { token, email: user.email, prenom: user.prenom, nom: user.nom };
}

// Applique le nouveau mot de passe si le code est valide (non expiré, non utilisé),
// puis marque le code comme utilisé pour qu'il ne serve qu'une fois.
// Code refusé : erreur 400 avec la raison (incorrect, déjà utilisé ou expiré).
async function reinitialiserMotDePasse(token, nouveauMotDePasse) {
  // Un copier-coller depuis l'e-mail peut ajouter des espaces ou un retour à la ligne
  const resetEntry = await userModel.findResetToken(String(token).trim());
  if (!resetEntry) throw badRequest('Code incorrect : vérifiez que vous avez collé le code complet du dernier e-mail reçu.');
  if (resetEntry.utilise) throw badRequest('Ce code a déjà été utilisé. Demandez-en un nouveau.');
  if (Number(resetEntry.expire)) throw badRequest(`Ce code a expiré (il est valable ${DUREE_CODE_MINUTES} minutes). Demandez-en un nouveau.`);

  const hash = await bcrypt.hash(nouveauMotDePasse, 10);
  await userModel.updatePasswordHash(resetEntry.id_utilisateur, hash);
  await userModel.marquerTokenUtilise(resetEntry.id_reset);
  // Mot de passe réinitialisé : on déconnecte tous les appareils
  await userModel.deactivateAllSessions(resetEntry.id_utilisateur);
  return true;
}

module.exports = {
  listerUtilisateurs, recupererUtilisateur, creerUtilisateur,
  modifierUtilisateur, supprimerUtilisateur,
  demanderReinitialisation, reinitialiserMotDePasse
};
