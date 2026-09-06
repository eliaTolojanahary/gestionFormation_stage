const db = require('../config/db');

async function getCommentairesBySupport(id_support) {
  const sql = `
    SELECT c.id_commentaire, c.contenu, c.date_commentaire, c.etat,
           u.nom, u.prenom
    FROM commentaire c
    JOIN etudiant e ON c.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    WHERE c.id_support = ? AND c.etat = true
    ORDER BY c.date_commentaire ASC
  `;
  const [rows] = await db.query(sql, [id_support]);
  return rows;
}

async function getIdEtudiantByUtilisateur(id_utilisateur) {
  const [rows] = await db.query('SELECT id_etudiant FROM etudiant WHERE id_utilisateur = ?', [id_utilisateur]);
  return rows[0]?.id_etudiant;
}

async function insertCommentaire(connection, { id_support, id_etudiant, contenu }) {
  const [result] = await connection.query(
    `INSERT INTO commentaire (id_support, id_etudiant, contenu, date_commentaire, etat) VALUES (?, ?, ?, CURDATE(), true)`,
    [id_support, id_etudiant, contenu]
  );
  return result.insertId;
}

async function insertMentions(connection, id_commentaire, mentions) {
  const values = mentions.map(id_etudiant_mentionne => [id_commentaire, id_etudiant_mentionne]);
  await connection.query(
    `INSERT INTO commentaire_mention (id_commentaire, id_etudiant_mentionne) VALUES ?`,
    [values]
  );
}

async function deleteCommentaire(id_commentaire) {
  const [result] = await db.query('UPDATE commentaire SET etat = false WHERE id_commentaire = ?', [id_commentaire]);
  return result.affectedRows > 0;
}

module.exports = {
  getCommentairesBySupport, getIdEtudiantByUtilisateur,
  insertCommentaire, insertMentions, deleteCommentaire
};