const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function getAllEtudiants() {
  const sql = `
    SELECT e.id_etudiant, e.photo_1, e.photo_2, e.certificat_residence, 
           e.photocopie_cin, e.etat,
           u.nom, u.prenom, u.email, u.telephone
    FROM etudiant e
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    WHERE e.etat = true
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function getEtudiantById(id_etudiant) {
  const sql = `
    SELECT e.*, u.nom, u.prenom, u.email, u.telephone
    FROM etudiant e
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    WHERE e.id_etudiant = ? AND e.etat = true
  `;
  const [rows] = await db.query(sql, [id_etudiant]);
  return rows[0];
}

async function getFormationsByEtudiant(id_etudiant) {
  const sql = `
    SELECT f.id_formation, f.nom, f.description, f.tarif, f.duree, i.date_inscription
    FROM inscription i
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.id_etudiant = ? AND i.etat = true
  `;
  const [rows] = await db.query(sql, [id_etudiant]);
  return rows;
}

async function insertUtilisateurEtEtudiant(connection, { nom, prenom, email, mot_de_passe_hash, telephone, id_role, photo_1, photo_2, certificat_residence, photocopie_cin }) {
  const [userResult] = await connection.query(
    `INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, id_role, etat) VALUES (?, ?, ?, ?, ?, ?, true)`,
    [nom, prenom, email, mot_de_passe_hash, telephone, id_role]
  );
  const id_utilisateur = userResult.insertId;

  const [etudiantResult] = await connection.query(
    `INSERT INTO etudiant (id_utilisateur, photo_1, photo_2, certificat_residence, photocopie_cin, etat) VALUES (?, ?, ?, ?, ?, true)`,
    [id_utilisateur, photo_1, photo_2, certificat_residence, photocopie_cin]
  );

  return etudiantResult.insertId;
}
async function updateEtudiant(id_etudiant, { nom, prenom, email, telephone, id_role, photo_1, photo_2, certificat_residence, photocopie_cin }) {
  const sqlUtilisateur = `
    UPDATE utilisateur u
    JOIN etudiant e ON e.id_utilisateur = u.id_utilisateur
    SET u.nom = ?, u.prenom = ?, u.email = ?, u.telephone = ?, u.id_role = ?
    WHERE e.id_etudiant = ?
  `;
  await db.query(sqlUtilisateur, [nom, prenom, email, telephone, id_role, id_etudiant]);
  const sqlEtudiant = `
    UPDATE etudiant 
    SET photo_1 = COALESCE(?, photo_1),
      photo_2 = COALESCE(?, photo_2),
      certificat_residence = COALESCE(?, certificat_residence),
      photocopie_cin = COALESCE(?, photocopie_cin)
    WHERE id_etudiant = ?
  `;
  const [result] = await db.query(sqlEtudiant, [photo_1, photo_2, certificat_residence, photocopie_cin, id_etudiant]);

  return result.affectedRows > 0;
}

async function deleteEtudiant(id_etudiant) {
  const [result] = await db.query('UPDATE etudiant SET etat = false WHERE id_etudiant = ?', [id_etudiant]);
  return result.affectedRows > 0;
}

module.exports = {
  getAllEtudiants, getEtudiantById, getFormationsByEtudiant,
insertUtilisateurEtEtudiant, updateEtudiant, deleteEtudiant
};