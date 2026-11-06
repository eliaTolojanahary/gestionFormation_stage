// Purge quotidienne des lignes devenues inutiles (tâche lancée par app.js), pour que les tables qui
// grossissent à chaque connexion ou notification ne grossissent pas sans fin.
// Seules des données mortes sont supprimées ; l'historique utile (paiements, présence, e-mails
// envoyés, notifications non supprimées) est gardé.
//   sessions        : expirées depuis plus de JOURS_SESSIONS jours (la page « Sessions » n'affiche
//                     que les 10 dernières, la dernière connexion reste)
//   reset_password  : codes « mot de passe oublié » expirés depuis plus d'un jour
//   notification_inapp : notifications supprimées par l'utilisateur (etat = false) depuis plus de
//                     JOURS_NOTIFICATIONS jours
// Suppression par paquets de TAILLE_PAQUET lignes : jamais un DELETE géant qui bloquerait la table.
const db = require('../config/db');

const JOURS_SESSIONS = 180;
const JOURS_NOTIFICATIONS = 30;
const TAILLE_PAQUET = 5000;
const INTERVALLE_MS = 24 * 60 * 60 * 1000; // une fois par jour

const REGLES = [
  ['sessions', `DELETE FROM sessions
                WHERE expire_le < DATE_SUB(NOW(), INTERVAL ${JOURS_SESSIONS} DAY) LIMIT ?`],
  ['reset_password', `DELETE FROM reset_password
                      WHERE date_expiration < DATE_SUB(NOW(), INTERVAL 1 DAY) LIMIT ?`],
  ['notification_inapp', `DELETE FROM notification_inapp
                          WHERE etat = false AND date_creation < DATE_SUB(NOW(), INTERVAL ${JOURS_NOTIFICATIONS} DAY) LIMIT ?`],
];

// Une purge complète ; renvoie le nombre de lignes supprimées par table
async function purger() {
  const supprimees = {};
  for (const [table, sql] of REGLES) {
    supprimees[table] = 0;
    for (;;) {
      const [resultat] = await db.query(sql, [TAILLE_PAQUET]);
      supprimees[table] += resultat.affectedRows;
      if (resultat.affectedRows < TAILLE_PAQUET) break;
    }
  }
  return supprimees;
}

// Une erreur (base indisponible...) est seulement journalisée : elle ne doit pas arrêter le serveur
let purgeEnCours = false;
async function purgerSansPlanter() {
  if (purgeEnCours) return;
  purgeEnCours = true;
  try {
    const supprimees = await purger();
    const total = Object.values(supprimees).reduce((a, b) => a + b, 0);
    if (total) console.log('Purge quotidienne :', supprimees);
  } catch (error) {
    console.error('Purge quotidienne échouée :', error.message);
  } finally {
    purgeEnCours = false;
  }
}

// Lancée au démarrage du serveur puis une fois par jour
function demarrerPurgeQuotidienne() {
  purgerSansPlanter();
  const minuterie = setInterval(purgerSansPlanter, INTERVALLE_MS);
  minuterie.unref(); // n'empêche pas le processus de s'arrêter
  return minuterie;
}

module.exports = { purger, demarrerPurgeQuotidienne, JOURS_SESSIONS, JOURS_NOTIFICATIONS };
