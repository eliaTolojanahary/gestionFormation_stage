// Model des étudiants : table `etudiant` (pièces justificatives) jointe à `utilisateur` (identité).
const db = require('../config/db');
const { ROLES } = require('../config/roles');
const { clauseLimite } = require('../utils/pagination');
const { conditionUtilisateur } = require('../utils/recherche');
const { conditionEtat } = require('../utils/etat');
const { STATUT_INSCRIPTION } = require('./inscriptionModel');

// Filtres de la liste : recherche dans le nom, le prénom, l'e-mail, le téléphone (index plein texte,
// voir utils/recherche.js) et état (actif par défaut, désactivé ou tous).
// id_formateur : seulement les étudiants inscrits (inscription active) à une de ses formations.
// Les conditions ne portent que sur la table etudiant : le total se compte sans jointure.
function filtresEtudiants({ recherche, etat, id_formateur } = {}) {
  const conditions = [conditionEtat('e.etat', etat)].filter(Boolean);
  const params = [];
  if (id_formateur) {
    conditions.push(`e.id_etudiant IN (SELECT fi.id_etudiant FROM inscription fi
                       JOIN formation ff ON ff.id_formation = fi.id_formation
                      WHERE ff.id_utilisateur = ? AND ff.etat = true AND fi.etat = true)`);
    params.push(id_formateur);
  }
  if (recherche) {
    const condition = conditionUtilisateur('e.id_utilisateur', recherche);
    conditions.push(condition.sql);
    params.push(...condition.params);
  }
  return { where: conditions.join(' AND ') || '1 = 1', params };
}

// Étudiants actifs avec leurs infos de compte, triés par nom ; `pagination` = page demandée (ou null : tous).
// Tri entièrement sur utilisateur (nom, prénom, id) : l'index idx_utilisateur_nom donne les lignes
// déjà dans l'ordre, MariaDB s'arrête après la page.
async function getAllEtudiants(filtres = {}, pagination = null) {
  const { where, params } = filtresEtudiants(filtres);
  const limite = clauseLimite(pagination);
  const sql = `
    SELECT e.id_etudiant, e.photo_1, e.photo_2, e.certificat_residence,
           e.photocopie_cin, e.etat,
           u.nom, u.prenom, u.email, u.telephone, u.photo as photo
    FROM etudiant e
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    WHERE ${where}
    ORDER BY u.nom, u.prenom, u.id_utilisateur${limite.sql}
  `;
  const [rows] = await db.query(sql, [...params, ...limite.params]);
  return rows;
}

// Nombre d'étudiants correspondant aux mêmes filtres (total de la pagination)
async function compterEtudiants(filtres = {}) {
  const { where, params } = filtresEtudiants(filtres);
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM etudiant e WHERE ${where}`,
    params
  );
  return Number(total);
}

async function getEtudiantById(id_etudiant) {
  const sql = `
    SELECT e.*, u.nom, u.prenom, u.email, u.telephone, u.photo
    FROM etudiant e
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    WHERE e.id_etudiant = ? AND e.etat = true
  `;
  const [rows] = await db.query(sql, [id_etudiant]);
  return rows[0];
}

// Formations où l'étudiant a une inscription active, avec le nom du formateur
async function getFormationsByEtudiant(id_etudiant) {
  const sql = `
    SELECT
      f.id_formation,
      f.nom,
      f.description,
      f.tarif,
      f.duree,
      i.date_inscription,
      i.valide,
      ${STATUT_INSCRIPTION()} AS statut,
      f.id_utilisateur AS id_formateur,
      u.nom    AS nom_formateur,
      u.prenom AS prenom_formateur
    FROM inscription i
    JOIN formation f   ON i.id_formation   = f.id_formation
    LEFT JOIN utilisateur u ON f.id_utilisateur = u.id_utilisateur
    WHERE i.id_etudiant = ? AND i.etat = true
  `;
  const [rows] = await db.query(sql, [id_etudiant]);
  return rows;
}

// Insère le compte utilisateur puis la fiche étudiant (dans la transaction de `connection`).
// Le rôle est imposé côté serveur : on ne fait jamais confiance à un id_role venu du client.
async function insertUtilisateurEtEtudiant(connection, { nom, prenom, email, mot_de_passe_hash, telephone, photo, photo_1, photo_2, certificat_residence, photocopie_cin }) {
  const [userResult] = await connection.query(
    `INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, id_role, photo, etat)
     VALUES (?, ?, ?, ?, ?, (SELECT id_role FROM role WHERE nom = ?), ?, true)`,
    [nom, prenom, email, mot_de_passe_hash, telephone, ROLES.ETUDIANT, photo || null]
  );
  const id_utilisateur = userResult.insertId;

  const [etudiantResult] = await connection.query(
    `INSERT INTO etudiant (id_utilisateur, photo_1, photo_2, certificat_residence, photocopie_cin, etat) VALUES (?, ?, ?, ?, ?, true)`,
    [id_utilisateur, photo_1, photo_2, certificat_residence, photocopie_cin]
  );

  return etudiantResult.insertId;
}

// Les champs non transmis (undefined/null) conservent leur valeur actuelle.
async function updateEtudiant(connection, id_etudiant, { nom, prenom, email, telephone, photo, photo_1, photo_2, certificat_residence, photocopie_cin }) {
  const sqlUtilisateur = `
    UPDATE utilisateur u
    JOIN etudiant e ON e.id_utilisateur = u.id_utilisateur
    SET u.nom = COALESCE(?, u.nom),
        u.prenom = COALESCE(?, u.prenom),
        u.email = COALESCE(?, u.email),
        u.telephone = COALESCE(?, u.telephone),
        u.photo = COALESCE(?, u.photo)
    WHERE e.id_etudiant = ? AND e.etat = true
  `;
  await connection.query(sqlUtilisateur, [nom ?? null, prenom ?? null, email ?? null, telephone ?? null, photo ?? null, id_etudiant]);

  const sqlEtudiant = `
    UPDATE etudiant
    SET photo_1 = COALESCE(?, photo_1),
        photo_2 = COALESCE(?, photo_2),
        certificat_residence = COALESCE(?, certificat_residence),
        photocopie_cin = COALESCE(?, photocopie_cin)
    WHERE id_etudiant = ? AND etat = true
  `;
  const [result] = await connection.query(sqlEtudiant, [photo_1 ?? null, photo_2 ?? null, certificat_residence ?? null, photocopie_cin ?? null, id_etudiant]);

  return result.affectedRows > 0;
}

// id_etudiant correspondant à un compte utilisateur (null si ce n'est pas un étudiant)
async function getIdEtudiantByUtilisateur(id_utilisateur) {
  const [rows] = await db.query(
    'SELECT id_etudiant FROM etudiant WHERE id_utilisateur = ? AND etat = true',
    [id_utilisateur]
  );
  return rows[0]?.id_etudiant ?? null;
}

module.exports = {
  getAllEtudiants, compterEtudiants, getEtudiantById, getFormationsByEtudiant,
  insertUtilisateurEtEtudiant, updateEtudiant,
  getIdEtudiantByUtilisateur,
};