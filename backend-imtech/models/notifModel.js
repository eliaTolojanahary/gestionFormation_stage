// Model des notifications : in-app (notification_inapp) et historique des e-mails (notification_email).
const db = require('../config/db');

// Notifications non supprimées de l'utilisateur, les plus récentes d'abord
async function notifFindByUtilisateur(id_utilisateur) {
  const sql = `
    SELECT id_notification, message, lu, date_creation
    FROM notification_inapp
    WHERE id_utilisateur = ? AND etat = true
    ORDER BY date_creation DESC
  `;
  const [rows] = await db.query(sql, [id_utilisateur]);
  return rows;
}

// Le filtre sur id_utilisateur empêche de toucher aux notifications d'un autre
async function updateLu(id_notification, id_utilisateur) {
  const sql = `UPDATE notification_inapp SET lu = true WHERE id_notification = ? AND id_utilisateur = ?`;
  const [result] = await db.query(sql, [id_notification, id_utilisateur]);
  return result.affectedRows > 0;
}

// Suppression logique (etat = false)
async function deleteNotification(id_notification, id_utilisateur) {
  const sql = `UPDATE notification_inapp set etat=false WHERE id_notification = ? AND id_utilisateur = ?`;
  const [result] = await db.query(sql, [id_notification, id_utilisateur]);
  return result.affectedRows > 0;
}

// Trace d'un e-mail envoyé
async function insertNotificationEmail(id_utilisateur, email, contenu) {
  const sql = `INSERT INTO notification_email (id_utilisateur, email, contenu) VALUES (?, ?, ?)`;
  await db.query(sql, [id_utilisateur, email, contenu]);
}
async function insertNotificationInApp(id_utilisateur, message) {
  const sql = `INSERT INTO notification_inapp (id_utilisateur, message) VALUES (?, ?)`;
  await db.query(sql, [id_utilisateur, message]);
}

// Même message pour plusieurs destinataires, en une seule requête INSERT
async function insertNotificationsInApp(ids_utilisateurs, message) {
  if (ids_utilisateurs.length === 0) return;
  const values = ids_utilisateurs.map((id) => [id, message]);
  await db.query(`INSERT INTO notification_inapp (id_utilisateur, message) VALUES ?`, [values]);
}

// Titre du support, formation et nom de l'auteur, pour composer le message de mention
async function getContexteMention(id_support, id_auteur) {
  const [rows] = await db.query(
    `SELECT s.titre AS support_titre, f.nom AS formation_nom,
            u.prenom AS auteur_prenom, u.nom AS auteur_nom
     FROM support s
     JOIN formation f ON s.id_formation = f.id_formation
     JOIN utilisateur u ON u.id_utilisateur = ?
     WHERE s.id_support = ?`,
    [id_auteur, id_support]
  );
  return rows[0] || null;
}

// Convertit des id_etudiant en id_utilisateur (les notifications sont liées aux comptes)
async function getIdsUtilisateursEtudiants(ids_etudiants) {
  if (ids_etudiants.length === 0) return [];
  const [rows] = await db.query(
    `SELECT id_utilisateur FROM etudiant WHERE id_etudiant IN (?) AND id_utilisateur IS NOT NULL`,
    [ids_etudiants]
  );
  return rows.map((r) => r.id_utilisateur);
}

module.exports = {
  insertNotificationInApp, insertNotificationsInApp, insertNotificationEmail,
  notifFindByUtilisateur, updateLu, deleteNotification,
  getContexteMention, getIdsUtilisateursEtudiants,
};