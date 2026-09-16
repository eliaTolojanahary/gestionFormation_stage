const notifModel = require('../models/notifModel');
const { envoyerEmail } = require('../utils/mailer');

async function notifierInApp(id_utilisateur, message) {
  return await notifModel.insertNotificationInApp(id_utilisateur, message);
}

async function notifierEmail(id_utilisateur, email, sujet, contenuHtml, expediteur = null) {
  // Enregistrement en base de données si nécessaire
  await notifModel.insertNotificationEmail(id_utilisateur, email, contenuHtml);
  
  // Envoi de l'e-mail
  return await envoyerEmail({
    to: email,
    subject: sujet,
    html: contenuHtml,
    expediteur,
  });
}

async function notifierEmailAvecPieceJointe(id_utilisateur, email, sujet, contenuHtml, cheminFichier, nomFichier, expediteur = null) {
  // Correction de la variable notificationModel -> notifModel
  await notifModel.insertNotificationEmail(id_utilisateur, email, contenuHtml);

  return await envoyerEmail({
    to: email,
    subject: sujet,
    html: contenuHtml,
    attachments: [{ filename: nomFichier, path: cheminFichier }],
    expediteur,
  });
}

async function listerNotifications(id_utilisateur) {
  return await notifModel.notifFindByUtilisateur(id_utilisateur);
}

async function marquerCommeLue(id_notification, id_utilisateur) {
  return await notifModel.updateLu(id_notification, id_utilisateur);
}

async function supprimerNotification(id_notification, id_utilisateur) {
  return await notifModel.deleteNotification(id_notification, id_utilisateur);
}

module.exports = {
  notifierInApp,
  notifierEmail,
  notifierEmailAvecPieceJointe,
  listerNotifications,
  marquerCommeLue,
  supprimerNotification,
};