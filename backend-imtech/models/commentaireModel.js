// Model des commentaires et de leurs mentions.
const db = require('../config/db');

const { clauseCurseur } = require('../utils/pagination');

// Colonnes d'un commentaire affiché. L'auteur est soit un étudiant (id_etudiant), soit un autre
// utilisateur (id_utilisateur) : COALESCE prend le nom / la photo de celui qui est renseigné.
const COLONNES = `
  c.id_commentaire, c.id_support, c.id_parent, c.contenu, c.date_commentaire, c.etat,
  COALESCE(u_etudiant.nom, u_auteur.nom) AS nom,
  COALESCE(u_etudiant.prenom, u_auteur.prenom) AS prenom,
  COALESCE(u_etudiant.photo, u_auteur.photo) AS photo,
  c.id_utilisateur AS id_utilisateur_auteur,
  s.titre AS titre_support
`;
const JOINTURES = `
  JOIN support s ON s.id_support = c.id_support
  LEFT JOIN etudiant e ON c.id_etudiant = e.id_etudiant
  LEFT JOIN utilisateur u_etudiant ON e.id_utilisateur = u_etudiant.id_utilisateur
  LEFT JOIN utilisateur u_auteur ON c.id_utilisateur = u_auteur.id_utilisateur
`;

// Fil visé : un support ({ id_support }) ou tous les supports publiés d'une formation ({ id_formation })
function conditionCible({ id_support, id_formation }) {
  return id_support
    ? { sql: 'c.id_support = ?', params: [id_support] }
    : { sql: "s.id_formation = ? AND s.etat = true AND s.statut = 'publie'", params: [id_formation] };
}

// Commentaires principaux d'un fil, du plus récent au plus ancien.
// curseur { limite, avant } : une page (limite + 1 lignes) ; null : tout le fil.
async function getCommentairesPrincipaux(cible, curseur = null) {
  const condition = conditionCible(cible);
  const page = clauseCurseur(curseur, { table: 'commentaire', alias: 'c', date: 'date_commentaire', id: 'id_commentaire' });
  const [rows] = await db.query(
    `SELECT ${COLONNES}
     FROM commentaire c ${JOINTURES}
     WHERE ${condition.sql} AND c.id_parent IS NULL AND c.etat = true${page.where}
     ORDER BY c.date_commentaire DESC, c.id_commentaire DESC${page.limite}`,
    [...condition.params, ...page.whereParams, ...page.limiteParams]
  );
  return rows;
}

// Réponses des commentaires principaux donnés (une seule requête pour toute la page)
async function getReponses(ids_principaux) {
  if (ids_principaux.length === 0) return [];
  const [rows] = await db.query(
    `SELECT ${COLONNES}
     FROM commentaire c ${JOINTURES}
     WHERE c.id_parent IN (?) AND c.etat = true
     ORDER BY c.date_commentaire ASC, c.id_commentaire ASC`,
    [ids_principaux]
  );
  return rows;
}

// { principaux, echanges } : commentaires principaux, et échanges (principaux + réponses encore visibles)
async function compterCommentaires(cible) {
  const condition = conditionCible(cible);
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(c.id_parent IS NULL), 0) AS principaux, COUNT(*) AS echanges
     FROM commentaire c
     JOIN support s ON s.id_support = c.id_support
     LEFT JOIN commentaire p ON p.id_commentaire = c.id_parent
     WHERE ${condition.sql} AND c.etat = true AND (c.id_parent IS NULL OR p.etat = true)`,
    condition.params
  );
  return { principaux: Number(rows[0].principaux), echanges: Number(rows[0].echanges) };
}

// Un commentaire complet (nom, photo de l'auteur...) : renvoyé juste après sa publication
async function getCommentaireComplet(id_commentaire) {
  const [rows] = await db.query(
    `SELECT ${COLONNES} FROM commentaire c ${JOINTURES} WHERE c.id_commentaire = ?`,
    [id_commentaire]
  );
  return rows[0] || null;
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
    `SELECT c.id_commentaire, c.id_support, c.id_parent, c.id_etudiant,
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
  getCommentairesPrincipaux, getReponses, compterCommentaires, getCommentaireComplet,
  getCommentaireAvecFormateur, getCommentaireParent,
  insertCommentaire, insertMentions, deleteCommentaire
};