// Model des formations (suppression logique via la colonne etat).
const db = require('../config/db');

// Formations actives ; si idUtilisateur est fourni, seulement celles de ce formateur
async function getAllFormations(idUtilisateur) {
  const sql = `
    SELECT f.id_formation, f.id_utilisateur, f.nom, f.description, f.engagement_formateur, f.image, f.tarif, f.duree, f.duree_jours, f.etat,
           u.nom AS nom_formateur, u.prenom AS prenom_formateur 
    FROM formation f
    JOIN utilisateur u ON f.id_utilisateur = u.id_utilisateur
    WHERE f.etat = true
    ${idUtilisateur ? 'AND f.id_utilisateur = ?' : ''}
  `;
  const [rows] = await db.query(sql, idUtilisateur ? [idUtilisateur] : []);
  return rows;
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

// Étudiants ayant une inscription active à la formation
async function getEtudiantsByFormation(id_formation) {
  const sql = `
    SELECT e.id_etudiant, u.nom, u.prenom, u.email, u.photo, i.date_inscription
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    WHERE i.id_formation = ? AND i.etat = true
    ORDER BY u.nom, u.prenom
  `;
  const [rows] = await db.query(sql, [id_formation]);
  return rows;
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

async function deleteFormation(id_formation) {
  const [result] = await db.query('UPDATE formation SET etat = false WHERE id_formation = ?', [id_formation]);
  return result.affectedRows > 0;
}

module.exports = {
  updateImageFormation,
  getAllFormations, getFormationById, getEtudiantsByFormation,
  insertFormation, updateFormation, deleteFormation
};