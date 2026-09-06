const bcrypt = require('bcryptjs');
const db = require('../config/db');
const etudiantModel = require('../models/etudiantModel');

async function listerEtudiants() {
  return await etudiantModel.getAllEtudiants();
}

async function recupererEtudiant(id) {
  return await etudiantModel.getEtudiantById(id);
}

async function recupererFormationsEtudiant(id) {
  return await etudiantModel.getFormationsByEtudiant(id);
}

async function creerEtudiant({ nom, prenom, email, mot_de_passe, telephone, id_role_etudiant, photo_1, photo_2, certificat_residence, photocopie_cin }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const mot_de_passe_hash = await bcrypt.hash(mot_de_passe, 10);

    const id_etudiant = await etudiantModel.insertUtilisateurEtEtudiant(connection, {
      nom, prenom, email, mot_de_passe_hash, telephone, id_role_etudiant,
      photo_1, photo_2, certificat_residence, photocopie_cin
    });

    await connection.commit();
    return id_etudiant;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function modifierEtudiant(id, data) {
  return await etudiantModel.updateEtudiant(id, data);
}

async function supprimerEtudiant(id) {
  return await etudiantModel.deleteEtudiant(id);
}

module.exports = {
  listerEtudiants, recupererEtudiant, recupererFormationsEtudiant,
  creerEtudiant, modifierEtudiant, supprimerEtudiant
};