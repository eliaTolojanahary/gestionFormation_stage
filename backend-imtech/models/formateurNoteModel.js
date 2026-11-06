// Model des commentaires de fin de formation sur les formateurs : un par inscription, écrit par
// l'étudiant à partir de J-1, puis noté sur 10 par l'Accueil ou le Super Admin.
const db = require('../config/db');
const { clauseLimite, motifLike } = require('../utils/pagination');
const { conditionPeriode, paramsPeriode } = require('../utils/periode');

const DATE_FIN = 'DATE_ADD(DATE(i.date_inscription), INTERVAL f.duree_jours DAY)';

// Inscription validée, active, à partir de la veille de la fin de formation, sans commentaire
const COMMENTAIRE_ATTENDU = `
  i.etat = true AND i.valide = true AND et.etat = true AND f.etat = true
  AND DATE_SUB(${DATE_FIN}, INTERVAL 1 DAY) <= CURDATE()
  AND NOT EXISTS (SELECT 1 FROM formateur_note fn WHERE fn.id_inscription = i.id_inscription)`;

const JOINTURES_INSCRIPTION = `
  JOIN formation f ON f.id_formation = i.id_formation
  JOIN utilisateur fo ON fo.id_utilisateur = f.id_utilisateur
  JOIN etudiant et ON et.id_etudiant = i.id_etudiant
  JOIN utilisateur u ON u.id_utilisateur = et.id_utilisateur`;

// Formations qu'un étudiant doit encore commenter
async function getACommenter(id_etudiant) {
  const [rows] = await db.query(
    `SELECT i.id_inscription, f.nom AS formation_nom, ${DATE_FIN} AS date_fin,
            fo.prenom AS formateur_prenom, fo.nom AS formateur_nom
     FROM inscription i ${JOINTURES_INSCRIPTION}
     WHERE i.id_etudiant = ? AND ${COMMENTAIRE_ATTENDU}
     ORDER BY date_fin`,
    [id_etudiant]
  );
  return rows;
}

// Étudiants à prévenir (tâche horaire), au plus `depuisJours` jours après la fin de formation
async function getInscriptionsARappeler(depuisJours) {
  const [rows] = await db.query(
    `SELECT i.id_inscription, f.nom AS formation_nom, u.id_utilisateur, u.email, u.prenom, u.nom,
            fo.prenom AS formateur_prenom, fo.nom AS formateur_nom
     FROM inscription i ${JOINTURES_INSCRIPTION}
     WHERE ${COMMENTAIRE_ATTENDU} AND ${DATE_FIN} >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [depuisJours]
  );
  return rows;
}

// Une inscription à commenter (droits, date) ; commentaire_existe = 1 s'il est déjà écrit
async function getInscriptionACommenter(id_inscription) {
  const [rows] = await db.query(
    `SELECT i.id_inscription, i.id_etudiant, i.valide, f.id_utilisateur AS id_formateur, f.nom AS formation_nom,
            u.prenom AS etudiant_prenom, u.nom AS etudiant_nom,
            fo.prenom AS formateur_prenom, fo.nom AS formateur_nom,
            DATE_SUB(${DATE_FIN}, INTERVAL 1 DAY) <= CURDATE() AS ouvert,
            EXISTS (SELECT 1 FROM formateur_note fn WHERE fn.id_inscription = i.id_inscription) AS commentaire_existe
     FROM inscription i ${JOINTURES_INSCRIPTION}
     WHERE i.id_inscription = ? AND i.etat = true`,
    [id_inscription]
  );
  return rows[0] || null;
}

async function commentaireExiste(id_inscription) {
  const [rows] = await db.query('SELECT 1 FROM formateur_note WHERE id_inscription = ?', [id_inscription]);
  return rows.length > 0;
}

async function insererCommentaire({ id_utilisateur, id_etudiant, id_inscription, commentaire }) {
  const [result] = await db.query(
    'INSERT INTO formateur_note (id_utilisateur, id_etudiant, id_inscription, commentaire) VALUES (?, ?, ?, ?)',
    [id_utilisateur, id_etudiant, id_inscription, commentaire]
  );
  return result.insertId;
}

function filtresCommentaires({ statut, recherche } = {}) {
  const conditions = ['1 = 1'];
  const params = [];
  if (statut === 'a_noter') conditions.push('fn.note IS NULL');
  if (statut === 'notes') conditions.push('fn.note IS NOT NULL');
  if (recherche) {
    conditions.push(`(CONCAT(u.prenom, ' ', u.nom) LIKE ? OR CONCAT(fo.prenom, ' ', fo.nom) LIKE ? OR f.nom LIKE ?)`);
    params.push(motifLike(recherche), motifLike(recherche), motifLike(recherche));
  }
  return { where: conditions.join(' AND '), params };
}

const JOINTURES_COMMENTAIRE = `
  FROM formateur_note fn
  JOIN inscription i ON i.id_inscription = fn.id_inscription
  JOIN formation f ON f.id_formation = i.id_formation
  JOIN utilisateur fo ON fo.id_utilisateur = fn.id_utilisateur
  JOIN etudiant et ON et.id_etudiant = fn.id_etudiant
  JOIN utilisateur u ON u.id_utilisateur = et.id_utilisateur`;

// Commentaires pour l'Accueil et le Super Admin, ceux à noter d'abord
async function getCommentaires(filtres = {}, pagination = null) {
  const { where, params } = filtresCommentaires(filtres);
  const limite = clauseLimite(pagination);
  const [rows] = await db.query(
    `SELECT fn.id_note, fn.note, fn.commentaire, fn.date_commentaire, f.nom AS formation_nom,
            u.prenom AS etudiant_prenom, u.nom AS etudiant_nom,
            fo.prenom AS formateur_prenom, fo.nom AS formateur_nom
     ${JOINTURES_COMMENTAIRE}
     WHERE ${where}
     ORDER BY fn.note IS NULL DESC, fn.date_commentaire DESC, fn.id_note DESC${limite.sql}`,
    [...params, ...limite.params]
  );
  return rows;
}

async function compterCommentaires(filtres = {}) {
  const { where, params } = filtresCommentaires(filtres);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${JOINTURES_COMMENTAIRE} WHERE ${where}`, params);
  return Number(total);
}

async function setNote(id_note, note) {
  const [result] = await db.query('UPDATE formateur_note SET note = ? WHERE id_note = ?', [note, id_note]);
  return result.affectedRows > 0;
}

// Par formateur : moyenne des notes données et nombre de commentaires, sur la période
async function getMoyennes(periode = {}) {
  const [rows] = await db.query(
    `SELECT id_utilisateur, AVG(note) AS note_commentaires, COUNT(*) AS nb_commentaires, COUNT(note) AS nb_notes
     FROM formateur_note
     WHERE ${conditionPeriode('date_commentaire')}
     GROUP BY id_utilisateur`,
    paramsPeriode(periode)
  );
  return rows;
}

module.exports = {
  getACommenter, getInscriptionsARappeler, getInscriptionACommenter, commentaireExiste, insererCommentaire,
  getCommentaires, compterCommentaires, setNote, getMoyennes,
};
