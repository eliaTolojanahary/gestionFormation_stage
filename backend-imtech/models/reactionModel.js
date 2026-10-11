// Model des réactions sur les supports (une réaction maximum par utilisateur et par support).
const db = require('../config/db');
const { ROLES } = require('../config/roles');

// Réactions d'un support avec leur type (nom, icône) et leur auteur
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

// Type de réaction actif, par son nom ('like', 'dislike'...) ou son id
async function getTypeReaction({ nom, id }) {
  const [rows] = await db.query(
    `SELECT id_type_reaction, nom FROM type_reaction
     WHERE etat = true AND (nom = ? OR id_type_reaction = ?)
     LIMIT 1`,
    [nom ?? null, id ?? null]
  );
  return rows[0] || null;
}

// Ajoute la réaction, ou remplace son type si l'utilisateur avait déjà réagi
// (ON DUPLICATE KEY UPDATE s'appuie sur la clé unique support + utilisateur)
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

// Pour chaque formateur actif : nombre de supports publiés et réactions reçues par type
async function getReactionsParFormateur() {
  const [rows] = await db.query(
    `SELECT u.id_utilisateur, u.nom, u.prenom, u.photo,
            COUNT(DISTINCT s.id_support) AS nb_supports,
            COALESCE(SUM(tr.nom = 'like'), 0) AS nb_like,
            COALESCE(SUM(tr.nom = 'coeur'), 0) AS nb_coeur,
            COALESCE(SUM(tr.nom = 'utile'), 0) AS nb_utile,
            COALESCE(SUM(tr.nom = 'dislike'), 0) AS nb_dislike
     FROM utilisateur u
     JOIN role ro ON ro.id_role = u.id_role
     LEFT JOIN support s ON s.id_utilisateur = u.id_utilisateur AND s.etat = true AND s.statut = 'publie'
     LEFT JOIN reaction r ON r.id_support = s.id_support
     LEFT JOIN type_reaction tr ON tr.id_type_reaction = r.id_type_reaction
     WHERE ro.nom = ? AND u.etat = true
     GROUP BY u.id_utilisateur, u.nom, u.prenom, u.photo`,
    [ROLES.FORMATEUR]
  );
  return rows;
}

module.exports = {
  getReactionsBySupport,
  getTypeReaction,
  ajouterOuModifierReaction,
  deleteReaction,
  getReactionsParFormateur,
};
