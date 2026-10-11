// Envoi programmé des supports de cours (tâche périodique lancée par app.js).
//  - 1 h avant l'heure prévue : les étudiants inscrits sont prévenus ;
//  - à l'heure prévue : le support est publié, étudiants et formateur sont prévenus.
// Jusque-là le support est un brouillon que le formateur peut modifier.
const supportModel = require('../models/supportModel');
const notifModel = require('../models/notifModel');

const UNE_MINUTE_MS = 60 * 1000;
const DELAI_ANNONCE_MS = 60 * UNE_MINUTE_MS; // annonce 1 h avant l'envoi
const INTERVALLE_VERIFICATION_MS = UNE_MINUTE_MS;

const formatHeure = (date) =>
  new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// « dans une heure », « dans 20 minutes »... selon le temps restant avant l'envoi
function formatDelai(dateEnvoi, maintenant) {
  const minutes = Math.round((new Date(dateEnvoi) - maintenant) / UNE_MINUTE_MS);
  if (minutes >= 55) return 'dans une heure';
  if (minutes <= 1) return 'dans un instant';
  return `dans ${minutes} minutes`;
}

function messageAnnonce(support, maintenant) {
  return `${support.prof_prenom} ${support.prof_nom} va envoyer le support « ${support.titre} » ` +
    `dans la formation ${support.nom_formation} ${formatDelai(support.date_envoi_prevue, maintenant)} ` +
    `(le ${formatHeure(support.date_envoi_prevue)}).`;
}

function messageEnvoi(support) {
  return `Le support « ${support.titre} » a été envoyé dans la formation ${support.nom_formation}.`;
}

// Notification « support envoyé » aux étudiants inscrits (et au formateur si demandé)
async function notifierSupportEnvoye(support, { prevenirFormateur = false } = {}) {
  const destinataires = await supportModel.getIdsUtilisateursInscrits(support.id_formation);
  if (prevenirFormateur) destinataires.push(support.id_utilisateur);
  await notifModel.insertNotificationsInApp(destinataires, messageEnvoi(support));
}

// Publie un brouillon puis prévient ; ne fait rien s'il a déjà été publié entre-temps
async function publier(support, options) {
  if (!(await supportModel.publierSupport(support.id_support))) return false;
  await notifierSupportEnvoye(support, options);
  return true;
}

/**
 * Une vérification : publie les supports dont l'heure est passée, puis annonce ceux
 * qui partent dans moins d'une heure. Chaque annonce / envoi n'a lieu qu'une fois.
 */
async function verifierSupportsProgrammes(maintenant = new Date()) {
  let envois = 0;
  let annonces = 0;

  // Envoi automatique : le formateur est prévenu aussi (il n'était pas forcément connecté)
  for (const support of await supportModel.getSupportsAPublier(maintenant)) {
    if (await publier(support, { prevenirFormateur: true })) envois += 1;
  }

  const limiteAnnonce = new Date(maintenant.getTime() + DELAI_ANNONCE_MS);
  for (const support of await supportModel.getSupportsAAnnoncer(limiteAnnonce)) {
    if (!(await supportModel.marquerAnnonceEnvoyee(support.id_support))) continue;
    const etudiants = await supportModel.getIdsUtilisateursInscrits(support.id_formation);
    await notifModel.insertNotificationsInApp(etudiants, messageAnnonce(support, maintenant));
    annonces += 1;
  }

  return { envois, annonces };
}

// Une vérification à la fois ; une erreur est seulement journalisée (le serveur continue)
let verificationEnCours = false;
async function verifierSansPlanter() {
  if (verificationEnCours) return;
  verificationEnCours = true;
  try {
    const { envois, annonces } = await verifierSupportsProgrammes();
    if (envois || annonces) {
      console.log(`📚 Supports programmés : ${envois} envoyé(s), ${annonces} annonce(s).`);
    }
  } catch (error) {
    console.error('❌ Vérification des supports programmés échouée :', error.message);
  } finally {
    verificationEnCours = false;
  }
}

// Lancé au démarrage du serveur puis chaque minute
function demarrerEnvoisProgrammes() {
  verifierSansPlanter();
  const minuterie = setInterval(verifierSansPlanter, INTERVALLE_VERIFICATION_MS);
  minuterie.unref(); // n'empêche pas le processus de s'arrêter
  return minuterie;
}

module.exports = {
  DELAI_ANNONCE_MS,
  formatDelai,
  messageAnnonce,
  messageEnvoi,
  notifierSupportEnvoye,
  publier,
  verifierSupportsProgrammes,
  demarrerEnvoisProgrammes,
};
