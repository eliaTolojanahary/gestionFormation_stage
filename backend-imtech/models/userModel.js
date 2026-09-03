const db = require('../config/db');

async function findAllUsers() {
  const [rows] = await db.query(
    `SELECT u.*, r.nom AS role_nom 
    FROM utilisateur u 
    JOIN role r ON u.id_role = r.id_role 
    WHERE u.etat = true`
  );
  return rows;
}


// Créer un utilisateur (Staff/Admin)
async function createUser({ nom, prenom, email, mot_de_passe, role }) {
  const sql = `INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)`;
  const [result] = await db.query(sql, [nom, prenom, email, mot_de_passe, role]);
  return result.insertId;
}

// Modifier un utilisateur
async function updateUser(id, { nom, prenom, email, role }) {
  const sql = `UPDATE utilisateur SET nom = ?, prenom = ?, email = ?, role = ? WHERE id_utilisateur = ?`;
  const [result] = await db.query(sql, [nom, prenom, email, role, id]);
  return result.affectedRows > 0;
}

// Supprimer un utilisateur
async function deleteUser(id) {
  const [result] = await db.query(`DELETE FROM utilisateur WHERE id_utilisateur = ?`, [id]);
  return result.affectedRows > 0;
}
// Tables en minuscules, conformes au SQL (évite les soucis de casse sous Linux)
async function findUserByEmail(email) {
  const sql = `
    SELECT u.*, r.nom AS role_nom 
    FROM utilisateur u 
    JOIN role r ON u.id_role = r.id_role 
    WHERE u.email = ? AND u.etat = true
  `;
  const [rows] = await db.query(sql, [email]);
  return rows[0];
}

async function findUserById(id) {
  const sql = `
    SELECT u.id_utilisateur, u.nom, u.prenom, u.email, r.nom AS role_nom 
    FROM utilisateur u 
    JOIN role r ON u.id_role = r.id_role 
    WHERE u.id_utilisateur = ? AND u.etat = true
  `;
  const [rows] = await db.query(sql, [id]);
  return rows[0];
}

module.exports = { findUserByEmail, findUserById,findAllUsers,updateUser,deleteUser,createUser };