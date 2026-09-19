const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userModel = require('../models/userModel');

async function listerUtilisateurs() {
  return await userModel.findAllUsers();
}

async function recupererUtilisateur(id) {
  return await userModel.findUserById(id);
}
async function changerMotDePasse(idUtilisateur, ancienMotDePasse, nouveauMotDePasse) {
  // 1. Récupération de l'utilisateur
  const user = await userModel.findUserWithPassword(idUtilisateur);
  if (!user) return false;

  // 2. Vérification de l'ancien mot de passe
  const match = await bcrypt.compare(ancienMotDePasse, user.mot_de_passe);
  if (!match) return false;

  // 3. Hashage du nouveau mot de passe
  const hash = await bcrypt.hash(nouveauMotDePasse, 10);

  // 4. Mise à jour de l'utilisateur avec le nouveau mot de passe hashé
  // On conserve les autres champs existants de l'utilisateur
  return await userModel.updateUser(
    idUtilisateur,
    user.nom,
    user.prenom,
    user.email,
    user.telephone,
    user.id_role,
    user.photo,
    hash // On passe le nouveau mot de passe hashé
  );
}

async function creerUtilisateur({ nom, prenom, email, mot_de_passe, telephone, id_role,photo   }) {
  const hash = await bcrypt.hash(mot_de_passe, 10);
  return await userModel.insertUser(nom, prenom, email, hash, telephone, id_role,photo);
}

async function modifierUtilisateur(id, { nom, prenom, email, telephone, id_role, photo, mot_de_passe }) {
  const hash = mot_de_passe ? await bcrypt.hash(mot_de_passe, 10) : undefined;
  return await userModel.updateUser(id, nom, prenom, email, telephone, id_role, photo, hash);
}


async function supprimerUtilisateur(id) {
  return await userModel.deleteUser(id);
}

async function demanderReinitialisation(email) {
  const user = await userModel.findUserByEmail(email);
  if (!user) return null; // le controller décide quoi répondre (message neutre)

  const token = crypto.randomBytes(32).toString('hex');
  const dateExpiration = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  await userModel.insertResetToken(user.id_utilisateur, token, dateExpiration);
  return { token, email: user.email, prenom: user.prenom };
}

async function reinitialiserMotDePasse(token, nouveauMotDePasse) {
  const resetEntry = await userModel.findValidResetToken(token);
  if (!resetEntry) return false;

  const hash = await bcrypt.hash(nouveauMotDePasse, 10);
  await userModel.updatePasswordHash(resetEntry.id_utilisateur, hash);
  await userModel.marquerTokenUtilise(resetEntry.id_reset);
  return true;
}

module.exports = {
  listerUtilisateurs, recupererUtilisateur, creerUtilisateur,
  modifierUtilisateur, supprimerUtilisateur,
  demanderReinitialisation, reinitialiserMotDePasse,
};