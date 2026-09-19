const db = require('../config/db');

async function findAllUsers() {
  const [rows] = await db.query(
    `SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone, u.photo, u.id_role, u.etat, r.nom AS role_nom 
     FROM utilisateur u 
     JOIN role r ON u.id_role = r.id_role 
     WHERE u.etat = true`
  );
  return rows;
}

async function findUserById(id) {
  const sql = `
    SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.telephone, u.photo, u.id_role, r.nom AS role_nom 
    FROM utilisateur u 
    JOIN role r ON u.id_role = r.id_role 
    WHERE u.id_utilisateur = ? AND u.etat = true
  `;
  const [rows] = await db.query(sql, [id]);
  return rows[0];
}
async function findUserByEmail(email) {
  const sql = `
    SELECT 
      u.id_utilisateur,
      u.nom,
      u.prenom,
      u.email,
      u.mot_de_passe,
      u.telephone,
      u.id_role,
      u.etat,
      u.photo,
      r.nom AS role_nom
    FROM utilisateur u
    JOIN role r ON u.id_role = r.id_role
    WHERE u.email = ? AND u.etat = true
  `;
  const [rows] = await db.query(sql, [email]);
  return rows[0];
}

async function findUserWithPassword(id) {
  const [rows] = await db.query('SELECT * FROM utilisateur WHERE id_utilisateur = ? AND etat = true', [id]);
  return rows[0];
}

async function insertUser(nom, prenom, email, mot_de_passe_hash, telephone, id_role, photo = null) {
  const sql = `INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, id_role, photo) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const [result] = await db.query(sql, [nom, prenom, email, mot_de_passe_hash, telephone, id_role, photo]);
  return result.insertId;
}

async function updateUser(id, nom, prenom, email, telephone, id_role, photo = null) {
  const sql = `UPDATE utilisateur SET nom = ?, prenom = ?, email = ?, telephone = ?, id_role = ?, photo = ? WHERE id_utilisateur = ?`;
  const [result] = await db.query(sql, [nom, prenom, email, telephone, id_role, photo, id]);
  return result.affectedRows > 0;
}

async function deleteUser(id) {
  const [result] = await db.query(`UPDATE utilisateur SET etat = false WHERE id_utilisateur = ?`, [id]);
  return result.affectedRows > 0;
}

async function updatePasswordHash(id_utilisateur, hash) {
  await db.query('UPDATE utilisateur SET mot_de_passe = ? WHERE id_utilisateur = ?', [hash, id_utilisateur]);
}

async function insertResetToken(id_utilisateur, token, dateExpiration) {
  const sql = `INSERT INTO reset_password (id_utilisateur, token, date_expiration, utilise) VALUES (?, ?, ?, false)`;
  await db.query(sql, [id_utilisateur, token, dateExpiration]);
}

async function findValidResetToken(token) {
  const sql = `SELECT * FROM reset_password WHERE token = ? AND utilise = false AND date_expiration > NOW()`;
  const [rows] = await db.query(sql, [token]);
  return rows[0];
}

async function marquerTokenUtilise(id_reset) {
  await db.query('UPDATE reset_password SET utilise = true WHERE id_reset = ?', [id_reset]);
}

module.exports = {
  findAllUsers, findUserById, findUserByEmail, findUserWithPassword,
  insertUser, updateUser, deleteUser,
  updatePasswordHash, insertResetToken, findValidResetToken, marquerTokenUtilise
};