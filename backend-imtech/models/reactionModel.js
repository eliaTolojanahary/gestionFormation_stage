const db = require('../config/db');

async function getReactionsBySupport(id_support) {
  const sql = `
    SELECT r.id_reaction, r.id_utilisateur, r.date_reaction,
           tr.nom AS type_reaction, tr.icone,
           u.nom, u.prenom
    FROM reaction r
    JOIN type_reaction tr ON r.id_type_reaction = tr.id_type_reaction
    JOIN utilisateur u ON r.id_utilisateur = u.id_utilisateur
    WHERE r.id_support = ?
  `;
  const [rows] = await db.query(sql, [id_support]);
  return rows;
}

async function ajouterOuModifierReaction(id_support, id_utilisateur, id_type_reaction) {
  const sql = `
    INSERT INTO reaction (id_support, id_utilisateur, id_type_reaction)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE id_type_reaction = ?, date_reaction = CURRENT_TIMESTAMP
  `;
  await db.query(sql, [id_support, id_utilisateur, id_type_reaction, id_type_reaction]);
}

async function deleteReaction(id_support, id_utilisateur) {
  const [result] = await db.query(
    'DELETE FROM reaction WHERE id_support = ? AND id_utilisateur = ?',
    [id_support, id_utilisateur]
  );
  return result.affectedRows > 0;
}

module.exports = { getReactionsBySupport, ajouterOuModifierReaction, deleteReaction };