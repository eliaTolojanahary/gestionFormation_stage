// Model des utilisateurs, des sessions de connexion et des codes de réinitialisation.
// Suppression logique : un utilisateur supprimé a etat = false et n'est plus jamais renvoyé.
const db = require('../config/db');

// ─── Utilisateurs ───────────────────────────

// Utilisateurs actifs avec le nom de leur rôle (sans mot de passe)
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

// Inclut le hash du mot de passe : réservé à la connexion
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

// id des utilisateurs actifs ayant l'un des rôles donnés (ex. tout le personnel d'accueil)
async function findIdsByRoles(roles) {
  if (roles.length === 0) return [];
  const [rows] = await db.query(
    `SELECT u.id_utilisateur FROM utilisateur u
     JOIN role r ON u.id_role = r.id_role
     WHERE r.nom IN (?) AND u.etat = true`,
    [roles]
  );
  return rows.map((r) => r.id_utilisateur);
}

// Ligne complète (avec hash du mot de passe) : pour vérifier l'ancien mot de passe
async function findUserWithPassword(id) {
  const [rows] = await db.query('SELECT * FROM utilisateur WHERE id_utilisateur = ? AND etat = true', [id]);
  return rows[0];
}

async function insertUser(nom, prenom, email, mot_de_passe_hash, telephone, id_role, photo = null) {
  const sql = `INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, id_role, photo) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const [result] = await db.query(sql, [nom, prenom, email, mot_de_passe_hash, telephone, id_role, photo]);
  return result.insertId;
}

// Mise à jour partielle : un champ non transmis (undefined/null) garde sa valeur actuelle.
async function updateUser(id, { nom, prenom, email, telephone, id_role, photo, mot_de_passe_hash }) {
  const sql = `
    UPDATE utilisateur
    SET nom = COALESCE(?, nom),
        prenom = COALESCE(?, prenom),
        email = COALESCE(?, email),
        telephone = COALESCE(?, telephone),
        id_role = COALESCE(?, id_role),
        photo = COALESCE(?, photo),
        mot_de_passe = COALESCE(?, mot_de_passe)
    WHERE id_utilisateur = ? AND etat = true
  `;
  const [result] = await db.query(sql, [
    nom ?? null, prenom ?? null, email ?? null, telephone ?? null,
    id_role ?? null, photo ?? null, mot_de_passe_hash ?? null, id,
  ]);
  return result.affectedRows > 0;
}

// Suppression logique (etat = false)
async function deleteUser(id) {
  const [result] = await db.query(`UPDATE utilisateur SET etat = false WHERE id_utilisateur = ?`, [id]);
  return result.affectedRows > 0;
}

async function updatePasswordHash(id_utilisateur, hash) {
  return await db.query('UPDATE utilisateur SET mot_de_passe = ? WHERE id_utilisateur = ?', [hash, id_utilisateur]);
}

// ─── Réinitialisation du mot de passe ───────

async function insertResetToken(id_utilisateur, token, dateExpiration) {
  const sql = `INSERT INTO reset_password (id_utilisateur, token, date_expiration, utilise) VALUES (?, ?, ?, false)`;
  await db.query(sql, [id_utilisateur, token, dateExpiration]);
}

// Code valide = pas encore utilisé et pas expiré
async function findValidResetToken(token) {
  const sql = `SELECT * FROM reset_password WHERE token = ? AND utilise = false AND date_expiration > NOW()`;
  const [rows] = await db.query(sql, [token]);
  return rows[0];
}

async function marquerTokenUtilise(id_reset) {
  await db.query('UPDATE reset_password SET utilise = true WHERE id_reset = ?', [id_reset]);
}

// ─── Sessions (une par connexion / appareil) ─

async function createSession(idUtilisateur, token, userAgent, ip, expireLe) {
  const [result] = await db.execute(
    `INSERT INTO sessions (id_utilisateur, token, user_agent, ip, expire_le, actif)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [idUtilisateur, token, userAgent || null, ip || null, expireLe]
  )
  return result.insertId
}

// Le token n'est jamais renvoyé au client : on expose seulement si la session est la courante.
async function findSessionsByUser(idUtilisateur, tokenCourant) {
  const [rows] = await db.execute(
    `SELECT id_session, user_agent, ip, cree_le, expire_le, actif,
            (token = ?) AS est_courante
     FROM sessions
     WHERE id_utilisateur = ?
     ORDER BY cree_le DESC
     LIMIT 20`,
    [tokenCourant, idUtilisateur]
  )
  return rows
}

// Utilisée à chaque requête par authMiddleware : la session doit être active et non expirée
async function findActiveSession(token) {
  const [rows] = await db.execute(
    `SELECT id_session, id_utilisateur
     FROM sessions
     WHERE token = ? AND actif = 1 AND (expire_le IS NULL OR expire_le > NOW())`,
    [token]
  )
  return rows[0] || null
}

async function findLastActiveSession(idUtilisateur) {
  const [rows] = await db.execute(
    `SELECT id_session, user_agent, ip, cree_le
     FROM sessions
     WHERE id_utilisateur = ? AND actif = 1
     ORDER BY cree_le DESC
     LIMIT 1`,
    [idUtilisateur]
  )
  return rows[0] || null
}

// Déconnecte tous les appareils sauf celui du token courant ; renvoie le nombre de sessions touchées
async function deactivateAllExcept(idUtilisateur, currentToken) {
  const [result] = await db.execute(
    `UPDATE sessions
     SET actif = 0
     WHERE id_utilisateur = ? AND token != ?`,
    [idUtilisateur, currentToken]
  )
  return result.affectedRows
}

async function deactivateAllSessions(idUtilisateur) {
  await db.execute(`UPDATE sessions SET actif = 0 WHERE id_utilisateur = ?`, [idUtilisateur])
}

async function deactivateSession(token) {
  await db.execute(
    `UPDATE sessions SET actif = 0 WHERE token = ?`,
    [token]
  )
}

module.exports = {
  createSession,
  findActiveSession,
  deactivateAllExcept,
  deactivateAllSessions,
  deactivateSession,
  findLastActiveSession,
  findSessionsByUser,
  findAllUsers, findUserById, findUserByEmail, findUserWithPassword, findIdsByRoles,
  insertUser, updateUser, deleteUser,
  updatePasswordHash, insertResetToken, findValidResetToken, marquerTokenUtilise
};