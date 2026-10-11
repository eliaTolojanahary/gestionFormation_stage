// Model des commentaires et de leurs mentions.
const db = require('../config/db');

// Commentaires d'un support (principaux ET réponses), dans l'ordre chronologique.
// Le service les range en fil de discussion grâce à id_parent.
// L'auteur est soit un étudiant (id_etudiant), soit un autre utilisateur (id_utilisateur) :
// COALESCE prend le nom / la photo de celui qui est renseigné.
async function getCommentairesBySupport(id_support) {
  const sql = `
    SELECT c.id_commentaire, c.id_support, c.id_parent, c.contenu, c.date_commentaire, c.etat,
           COALESCE(u_etudiant.nom, u_auteur.nom) AS nom,
       COALESCE(u_etudiant.prenom, u_auteur.prenom) AS prenom,
       COALESCE(u_etudiant.photo, u_auteur.photo) AS photo,   
       c.id_utilisateur AS id_utilisateur_auteur        
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

// Commentaire + formateur de la formation concernée (pour les droits de suppression)
async function getCommentaireAvecFormateur(id_commentaire) {
  const [rows] = await db.query(
    `SELECT c.id_commentaire, c.id_etudiant, c.id_utilisateur,
            f.id_utilisateur AS id_formateur
     FROM commentaire c
     JOIN support s ON c.id_support = s.id_support
     JOIN formation f ON s.id_formation = f.id_formation
     WHERE c.id_commentaire = ? AND c.etat = true`,
    [id_commentaire]
  );
  return rows[0] || null;
}

// Commentaire auquel on répond : support, parent éventuel et compte de son auteur
async function getCommentaireParent(id_commentaire) {
  const [rows] = await db.query(
    `SELECT c.id_commentaire, c.id_support, c.id_parent,
            COALESCE(e.id_utilisateur, c.id_utilisateur) AS id_utilisateur_auteur
     FROM commentaire c
     LEFT JOIN etudiant e ON e.id_etudiant = c.id_etudiant
     WHERE c.id_commentaire = ? AND c.etat = true`,
    [id_commentaire]
  );
  return rows[0] || null;
}

async function insertCommentaire(connection, { idSupport, idParent, idEtudiant, idUtilisateur, contenu }) {
  const [result] = await connection.query(
    `INSERT INTO commentaire (id_support, id_parent, id_etudiant, id_utilisateur, contenu, date_commentaire, etat)
     VALUES (?, ?, ?, ?, ?, NOW(), true)`,
    [idSupport, idParent || null, idEtudiant || null, idUtilisateur || null, contenu]
  );
  return result.insertId
}

// Une ligne commentaire_mention par étudiant mentionné (insertion groupée)
async function insertMentions(connection, id_commentaire, mentions) {
  const values = mentions.map(id_etudiant_mentionne => [id_commentaire, id_etudiant_mentionne]);
  await connection.query(
    `INSERT INTO commentaire_mention (id_commentaire, id_etudiant_mentionne) VALUES ?`,
    [values]
  );
}

// Suppression logique (etat = false)
async function deleteCommentaire(id_commentaire) {
  const [result] = await db.query('UPDATE commentaire SET etat = false WHERE id_commentaire = ?', [id_commentaire]);
  return result.affectedRows > 0;
}

module.exports = {
  getCommentairesBySupport, getCommentaireAvecFormateur, getCommentaireParent,
  insertCommentaire, insertMentions, deleteCommentaire
};