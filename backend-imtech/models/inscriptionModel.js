const db = require('../config/db');

async function insertInscription(id_etudiant, id_formation) {
  const sql = `
    INSERT INTO inscription (id_etudiant, id_formation, date_inscription, etat, valide) 
    VALUES (?, ?, CURDATE(), true, false)
  `;
  const [result] = await db.query(sql, [id_etudiant, id_formation]);
  return result.insertId;
}

async function setInscriptionValidee(id_inscription) {
  const sql = `UPDATE inscription SET valide = true WHERE id_inscription = ?`;
  const [result] = await db.query(sql, [id_inscription]);
  return result.affectedRows > 0;
}

async function findInscriptionAvecTarif(id_inscription) {
  const sql = `
    SELECT i.id_inscription, i.id_etudiant, i.id_formation, i.etat, i.valide,
           f.tarif, f.duree_jours
    FROM inscription i
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.id_inscription = ?
  `;
  const [rows] = await db.query(sql, [id_inscription]);
  return rows[0];
}

async function getAllInscriptions() {
  const sql = `
    SELECT i.id_inscription, i.date_inscription, i.etat, i.valide,
           e.id_etudiant, u.nom AS nom_etudiant, u.prenom AS prenom_etudiant,
           f.id_formation, f.nom AS nom_formation
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.etat = true
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function getInscriptionById(id_inscription) {
  const sql = `
    SELECT i.*, u.nom AS nom_etudiant, u.prenom AS prenom_etudiant, f.nom AS nom_formation
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.id_inscription = ? AND i.etat = true
  `;
  const [rows] = await db.query(sql, [id_inscription]);
  return rows[0];
}

async function deleteInscription(id_inscription) {
  const [result] = await db.query('UPDATE inscription SET etat = false WHERE id_inscription = ?', [id_inscription]);
  return result.affectedRows > 0;
}

module.exports = {
  insertInscription, setInscriptionValidee, findInscriptionAvecTarif,
  getAllInscriptions, getInscriptionById, deleteInscription
};