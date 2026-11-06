// Model des notifications : in-app (notification_inapp) et historique des e-mails (notification_email).
const db = require('../config/db');

// Notifications non supprimées de l'utilisateur, les plus récentes d'abord.
// Pagination par curseur (id_notification, toujours croissant) plutôt que par OFFSET :
// une notification qui arrive entre deux pages ne décale pas la suite (pas de doublon).
//   avant   : seulement les plus anciennes que cet id (bouton « Notifications précédentes »)
//   apres   : seulement les plus récentes que cet id (rafraîchissement automatique)
//   nonLues : onglet « Non lues »
//   limite  : nombre maximum de lignes (sans limite : toutes)
async function notifFindByUtilisateur(id_utilisateur, { avant, apres, nonLues, limite } = {}) {
  const conditions = ['id_utilisateur = ?', 'etat = true'];
  const params = [id_utilisateur];

  if (avant) { conditions.push('id_notification < ?'); params.push(avant); }
  if (apres) { conditions.push('id_notification > ?'); params.push(apres); }
  if (nonLues) conditions.push('lu = false');

  let sql = `
    SELECT id_notification, message, lu, date_creation
    FROM notification_inapp
    WHERE ${conditions.join(' AND ')}
    ORDER BY id_notification DESC
  `;
  if (limite) { sql += ' LIMIT ?'; params.push(limite); }

  const [rows] = await db.query(sql, params);
  return rows;
}

// Totaux pour les onglets et le badge de la cloche, sans charger la liste
async function countByUtilisateur(id_utilisateur) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(lu = false), 0) AS nonLues
     FROM notification_inapp
     WHERE id_utilisateur = ? AND etat = true`,
    [id_utilisateur]
  );
  return { total: Number(rows[0].total), nonLues: Number(rows[0].nonLues) };
}

// « Tout marquer comme lu » en une seule requête (y compris les notifications pas encore affichées)
async function updateToutLu(id_utilisateur) {
  const [result] = await db.query(
    `UPDATE notification_inapp SET lu = true WHERE id_utilisateur = ? AND etat = true AND lu = false`,
    [id_utilisateur]
  );
  return result.affectedRows;
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

// Même message pour plusieurs destinataires : un INSERT groupé par paquet de TAILLE_PAQUET_NOTIF
// (une formation de 100 000 inscrits ferait sinon une requête trop grosse pour MySQL, max_allowed_packet)
const TAILLE_PAQUET_NOTIF = 1000;
async function insertNotificationsInApp(ids_utilisateurs, message) {
  for (let debut = 0; debut < ids_utilisateurs.length; debut += TAILLE_PAQUET_NOTIF) {
    const values = ids_utilisateurs.slice(debut, debut + TAILLE_PAQUET_NOTIF).map((id) => [id, message]);
    await db.query(`INSERT INTO notification_inapp (id_utilisateur, message) VALUES ?`, [values]);
  }
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
  notifFindByUtilisateur, countByUtilisateur, updateLu, updateToutLu, deleteNotification,
  getContexteMention, getIdsUtilisateursEtudiants,
};