const db = require('../config/db');

async function getAllFormations() {
  const sql = `
    SELECT f.id_formation, f.nom, f.description, f.tarif, f.duree, f.duree_jours, f.etat,
           u.nom AS nom_formateur, u.prenom AS prenom_formateur 
    FROM formation f
    JOIN utilisateur u ON f.id_utilisateur = u.id_utilisateur
    WHERE f.etat = true
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function getFormationById(id_formation) {
  const sql = `
    SELECT f.*, u.nom AS nom_formateur, u.prenom AS prenom_formateur 
    FROM formation f
    JOIN utilisateur u ON f.id_utilisateur = u.id_utilisateur
    WHERE f.id_formation = ? AND f.etat = true
  `;
  const [rows] = await db.query(sql, [id_formation]);
  return rows[0];
}

async function getEtudiantsByFormation(id_formation) {
  const sql = `
    SELECT e.id_etudiant, u.nom, u.prenom, u.email, i.date_inscription
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    WHERE i.id_formation = ? AND i.etat = true
  `;
  const [rows] = await db.query(sql, [id_formation]);
  return rows;
}

async function insertFormation({ nom, description, tarif, duree, duree_jours, id_utilisateur }) {
  const sql = `
    INSERT INTO formation (nom, description, tarif, duree, duree_jours, id_utilisateur, etat)
    VALUES (?, ?, ?, ?, ?, ?, true)
  `;
  const [result] = await db.query(sql, [nom, description, tarif, duree, duree_jours, id_utilisateur]);
  return result.insertId;
}

async function updateFormation(id_formation, { nom, description, tarif, duree, duree_jours, id_utilisateur }) {
  const sql = `
    UPDATE formation 
    SET nom = ?, description = ?, tarif = ?, duree = ?, duree_jours = ?, id_utilisateur = ?
    WHERE id_formation = ?
  `;
  const [result] = await db.query(sql, [nom, description, tarif, duree, duree_jours, id_utilisateur, id_formation]);
  return result.affectedRows > 0;
}

async function deleteFormation(id_formation) {
  const [result] = await db.query('UPDATE formation SET etat = false WHERE id_formation = ?', [id_formation]);
  return result.affectedRows > 0;
}

module.exports = {
  getAllFormations, getFormationById, getEtudiantsByFormation,
  insertFormation, updateFormation, deleteFormation
};