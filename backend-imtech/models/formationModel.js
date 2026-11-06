// Model des formations (suppression logique via la colonne etat).
const db = require('../config/db');
const { conditionEtat } = require('../utils/etat');
const { clauseLimite, motifLike } = require('../utils/pagination');
const { conditionEtudiant } = require('../utils/recherche');

// Filtres : idUtilisateur (seulement les formations de ce formateur), etat (actives par défaut,
// voir utils/etat.js), recherche (nom, description, formateur)
function filtresFormations({ idUtilisateur, etat = 'actif', recherche } = {}) {
  const conditions = [conditionEtat('f.etat', etat)].filter(Boolean);
  const params = [];
  if (idUtilisateur) { conditions.push('f.id_utilisateur = ?'); params.push(idUtilisateur); }
  if (recherche) {
    const motif = motifLike(recherche);
    conditions.push(`(f.nom LIKE ? OR f.description LIKE ? OR CONCAT(u.prenom, ' ', u.nom) LIKE ?)`);
    params.push(motif, motif, motif);
  }
  return { where: conditions.join(' AND ') || '1 = 1', params };
}

// Formations avec leur formateur, triées par nom ; `pagination` = page demandée (ou null : toutes)
async function getAllFormations(filtres = {}, pagination = null) {
  const { where, params } = filtresFormations(filtres);
  const limite = clauseLimite(pagination);
  const sql = `
    SELECT f.id_formation, f.id_utilisateur, f.nom, f.description, f.engagement_formateur, f.image, f.tarif, f.duree, f.duree_jours, f.etat,
           u.nom AS nom_formateur, u.prenom AS prenom_formateur
    FROM formation f
    JOIN utilisateur u ON f.id_utilisateur = u.id_utilisateur
    WHERE ${where}
    ORDER BY f.nom, f.id_formation${limite.sql}
  `;
  const [rows] = await db.query(sql, [...params, ...limite.params]);
  return rows;
}

async function compterFormations(filtres = {}) {
  const { where, params } = filtresFormations(filtres);
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM formation f JOIN utilisateur u ON f.id_utilisateur = u.id_utilisateur WHERE ${where}`,
    params
  );
  return Number(total);
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

// Étudiants ayant une inscription active à la formation, par nom ;
// recherche : nom, prénom, e-mail, téléphone (index plein texte) ; pagination ou null (toute la liste,
// plafonnée, voir utils/pagination.js)
function filtresEtudiantsFormation(id_formation, recherche) {
  const conditions = ['i.id_formation = ?', 'i.etat = true'];
  const params = [id_formation];
  if (recherche) {
    const condition = conditionEtudiant('i.id_etudiant', recherche);
    conditions.push(condition.sql);
    params.push(...condition.params);
  }
  return { where: conditions.join(' AND '), params };
}

async function getEtudiantsByFormation(id_formation, { recherche } = {}, pagination = null) {
  const { where, params } = filtresEtudiantsFormation(id_formation, recherche);
  const limite = clauseLimite(pagination);
  const sql = `
    SELECT e.id_etudiant, u.nom, u.prenom, u.email, u.photo, i.date_inscription
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    WHERE ${where}
    ORDER BY u.nom, u.prenom, e.id_etudiant${limite.sql}
  `;
  const [rows] = await db.query(sql, [...params, ...limite.params]);
  return rows;
}

async function compterEtudiantsFormation(id_formation, { recherche } = {}) {
  const { where, params } = filtresEtudiantsFormation(id_formation, recherche);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM inscription i WHERE ${where}`, params);
  return Number(total);
}

// Parmi `ids_etudiants`, ceux qui ont une inscription active à la formation (vérification des mentions)
async function etudiantsInscritsParmi(id_formation, ids_etudiants) {
  if (ids_etudiants.length === 0) return [];
  const [rows] = await db.query(
    'SELECT DISTINCT id_etudiant FROM inscription WHERE id_formation = ? AND etat = true AND id_etudiant IN (?)',
    [id_formation, ids_etudiants]
  );
  return rows.map((r) => Number(r.id_etudiant));
}

async function insertFormation({ nom, description, engagement_formateur, tarif, duree, duree_jours, id_utilisateur }) {
  const sql = `
    INSERT INTO formation (nom, description, engagement_formateur, tarif, duree, duree_jours, id_utilisateur, etat)
    VALUES (?, ?, ?, ?, ?, ?, ?, true)
  `;
  const [result] = await db.query(sql, [nom, description, engagement_formateur || null, tarif, duree, duree_jours, id_utilisateur]);
  return result.insertId;
}

// Mise à jour partielle : COALESCE garde la valeur actuelle des champs non transmis
async function updateFormation(id_formation, { nom, description, engagement_formateur, tarif, duree, duree_jours, id_utilisateur }) {
  const sql = `
    UPDATE formation
    SET nom = COALESCE(?, nom),
        description = COALESCE(?, description),
        engagement_formateur = COALESCE(?, engagement_formateur),
        tarif = COALESCE(?, tarif),
        duree = COALESCE(?, duree),
        duree_jours = COALESCE(?, duree_jours),
        id_utilisateur = COALESCE(?, id_utilisateur)
    WHERE id_formation = ? AND etat = true
  `;
  const [result] = await db.query(sql, [
    nom ?? null, description ?? null, engagement_formateur ?? null, tarif ?? null, duree ?? null,
    duree_jours ?? null, id_utilisateur ?? null, id_formation,
  ]);
  return result.affectedRows > 0;
}

// Couverture de la formation (chemin "formations/xxx.jpg")
async function updateImageFormation(id_formation, image) {
  const [result] = await db.query('UPDATE formation SET image = ? WHERE id_formation = ? AND etat = true', [image, id_formation]);
  return result.affectedRows > 0;
}

module.exports = {
  updateImageFormation,
  getAllFormations, compterFormations, getFormationById,
  getEtudiantsByFormation, compterEtudiantsFormation, etudiantsInscritsParmi,
  insertFormation, updateFormation
};