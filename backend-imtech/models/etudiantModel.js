// Model des étudiants : table `etudiant` (pièces justificatives) jointe à `utilisateur` (identité).
const db = require('../config/db');
const { ROLES } = require('../config/roles');

// Étudiants actifs avec leurs infos de compte
async function getAllEtudiants() {
  const sql = `
    SELECT e.id_etudiant, e.photo_1, e.photo_2, e.certificat_residence, 
           e.photocopie_cin, e.etat,
           u.nom, u.prenom, u.email, u.telephone, u.photo as photo
    FROM etudiant e
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    WHERE e.etat = true
  `;
  const [rows] = await db.query(sql);
  return rows;
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

// Suppression logique de la fiche étudiant (etat = false)
async function deleteEtudiant(id_etudiant) {
  const [result] = await db.query('UPDATE etudiant SET etat = false WHERE id_etudiant = ?', [id_etudiant]);
  return result.affectedRows > 0;
}

module.exports = {
  getAllEtudiants, getEtudiantById, getFormationsByEtudiant,
  insertUtilisateurEtEtudiant, updateEtudiant, deleteEtudiant,
  getIdEtudiantByUtilisateur,
};