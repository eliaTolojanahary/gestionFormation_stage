const db = require('../config/db');

async function notifFindByUtilisateur(id_utilisateur) {
  const sql = `
    SELECT id_notification, message, lu, date_creation
    FROM notification_inapp
    WHERE id_utilisateur = ?
    ORDER BY date_creation DESC
  `;
  const [rows] = await db.query(sql, [id_utilisateur]);
  return rows;
}

async function updateLu(id_notification, id_utilisateur) {
  const sql = `UPDATE notification_inapp SET lu = true WHERE id_notification = ? AND id_utilisateur = ?`;
  const [result] = await db.query(sql, [id_notification, id_utilisateur]);
  return result.affectedRows > 0;
}

async function deleteNotification(id_notification, id_utilisateur) {
  const sql = `UPDATE notification_inapp set etat=false WHERE id_notification = ? AND id_utilisateur = ?`;
  const [result] = await db.query(sql, [id_notification, id_utilisateur]);
  return result.affectedRows > 0;
}


async function insertNotificationEmail(id_utilisateur, email, contenu) {
  const sql = `INSERT INTO notification_email (id_utilisateur, email, contenu) VALUES (?, ?, ?)`;
  await db.query(sql, [id_utilisateur, email, contenu]);
}
async function insertNotificationInApp(id_utilisateur, message) {
  const sql = `INSERT INTO notification_inapp (id_utilisateur, message) VALUES (?, ?)`;
  await db.query(sql, [id_utilisateur, message]);
}

module.exports = {insertNotificationInApp,insertNotificationEmail, notifFindByUtilisateur, updateLu, deleteNotification };