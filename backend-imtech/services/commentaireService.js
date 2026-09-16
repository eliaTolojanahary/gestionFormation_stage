const db = require('../config/db');

async function getCommentairesBySupport(id_support) {
  const sql = `
    SELECT c.id_commentaire, c.contenu, c.date_commentaire, c.etat,
           COALESCE(u_etudiant.nom, u_auteur.nom) AS nom,
           COALESCE(u_etudiant.prenom, u_auteur.prenom) AS prenom
    FROM commentaire c
    LEFT JOIN etudiant e ON c.id_etudiant = e.id_etudiant
    LEFT JOIN utilisateur u_etudiant ON e.id_utilisateur = u_etudiant.id_utilisateur
    LEFT JOIN utilisateur u_auteur ON c.id_utilisateur = u_auteur.id_utilisateur
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

async function insertCommentaire(connection, { id_support, id_etudiant, id_utilisateur, contenu }) {
  const [result] = await connection.query(
    `INSERT INTO commentaire (id_support, id_etudiant, id_utilisateur, contenu, date_commentaire, etat) 
     VALUES (?, ?, ?, ?, CURDATE(), true)`,
    [id_support, id_etudiant || null, id_utilisateur || null, contenu]
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