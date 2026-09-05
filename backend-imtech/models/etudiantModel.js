const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function getAllEtudiants() {
  const sql = `
    SELECT e.id_etudiant, e.photo_1, e.photo_2, e.certificat_residence, 
           e.photocopie_cin, e.option_type, e.etat,
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


async function creerEtudiant({ nom, prenom, email, mot_de_passe, telephone, id_role_etudiant, photo_1, photo_2, certificat_residence, photocopie_cin }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
   
    const hash = await bcrypt.hash(mot_de_passe, 10);
    const [userResult] = await connection.query(
      `INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, id_role, etat) VALUES (?, ?, ?, ?, ?, ?, true)`,
      [nom, prenom, email, hash, telephone, id_role_etudiant]
    );
    const id_utilisateur = userResult.insertId;
    
    const [etudiantResult] = await connection.query(
      `INSERT INTO etudiant (id_utilisateur, photo_1, photo_2, certificat_residence, photocopie_cin, etat) VALUES (?, ?, ?, ?, ?, true)`,
      [id_utilisateur, photo_1, photo_2, certificat_residence, photocopie_cin ]
    );

    await connection.commit();
    return etudiantResult.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateEtudiant(id_etudiant, { photo_1, photo_2, certificat_residence, photocopie_cin, option_type }) {
  const sql = `
    UPDATE etudiant 
    SET photo_1 = ?, photo_2 = ?, certificat_residence = ?, photocopie_cin = ?, option_type = ?
    WHERE id_etudiant = ?
  `;
  const [result] = await db.query(sql, [photo_1, photo_2, certificat_residence, photocopie_cin, option_type, id_etudiant]);
  return result.affectedRows > 0;
}

async function deleteEtudiant(id_etudiant) {
  const [result] = await db.query('UPDATE etudiant SET etat = false WHERE id_etudiant = ?', [id_etudiant]);
  return result.affectedRows > 0;
}

module.exports = {
  getAllEtudiants, getEtudiantById, getFormationsByEtudiant,
  creerEtudiant, updateEtudiant, deleteEtudiant
};