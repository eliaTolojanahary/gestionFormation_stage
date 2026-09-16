const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userModel = require('../models/userModel');

async function listerUtilisateurs() {
  return await userModel.findAllUsers();
}

async function recupererUtilisateur(id) {
  return await userModel.findUserById(id);
}

async function creerUtilisateur({ nom, prenom, email, mot_de_passe, telephone, id_role }) {
  const hash = await bcrypt.hash(mot_de_passe, 10);
  return await userModel.insertUser(nom, prenom, email, hash, telephone, id_role);
}

async function modifierUtilisateur(id, { nom, prenom, email, telephone, id_role }) {
  return await userModel.updateUser(id, nom, prenom, email, telephone, id_role);
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
  demanderReinitialisation, reinitialiserMotDePasse
};