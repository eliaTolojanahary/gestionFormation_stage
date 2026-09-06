const db = require('../config/db');

async function getSupportsByFormation(id_formation) {
  const sql = `
    SELECT s.id_support, s.titre, s.fichier, s.date_publication, f.nom AS nom_formation, u.nom AS prof_nom, u.prenom AS prof_prenom
    FROM support s
    JOIN utilisateur u ON s.id_utilisateur = u.id_utilisateur
    JOIN formation f ON f.id_formation=s.id_formation
    WHERE s.id_formation = ? AND s.etat = true
    ORDER BY s.date_publication DESC
  `;
  const [rows] = await db.query(sql, [id_formation]);
  return rows;
}

async function createSupport({ id_formation, id_utilisateur, titre, fichier }) {
  const sql = `
    INSERT INTO support (id_formation, id_utilisateur, titre, fichier, date_publication, etat)
    VALUES (?, ?, ?, ?, CURDATE(), true)
  `;
  const [result] = await db.query(sql, [id_formation, id_utilisateur, titre, fichier]);
  return result.insertId;
}

async function deleteSupport(id_support) {
  const [result] = await db.query('UPDATE support SET etat = false WHERE id_support = ?', [id_support]);
  return result.affectedRows > 0;
}

module.exports = { getSupportsByFormation, createSupport, deleteSupport };