// Service des notifications : in-app (table notification) et e-mails.
// Chaque e-mail envoyé est aussi tracé en base.
const notifModel = require('../models/notifModel');
const userModel = require('../models/userModel');
const { STAFF } = require('../config/roles');
const { envoyerEmail } = require('../utils/mailer');

// Notification visible dans l'application (cloche / page Notifications)
async function notifierInApp(id_utilisateur, message) {
  return await notifModel.insertNotificationInApp(id_utilisateur, message);
}

// Trace l'e-mail en base puis l'envoie ; lève une erreur si l'envoi échoue
async function notifierEmail(id_utilisateur, email, sujet, contenuHtml, expediteur = null) {
  await notifModel.insertNotificationEmail(id_utilisateur, email, contenuHtml);

  // Envoi de l'e-mail
  return await envoyerEmail({
    to: email,
    subject: sujet,
    html: contenuHtml,
    expediteur,
  });
}

// Comme notifierEmail, avec un fichier joint (chemin sur le disque + nom affiché)
async function notifierEmailAvecPieceJointe(id_utilisateur, email, sujet, contenuHtml, cheminFichier, nomFichier, expediteur = null) {
  await notifModel.insertNotificationEmail(id_utilisateur, email, contenuHtml);

  return await envoyerEmail({
    to: email,
    subject: sujet,
    html: contenuHtml,
    attachments: [{ filename: nomFichier, path: cheminFichier }],
    expediteur,
  });
}

// Notification in-app à tout le personnel d'accueil (Accueil + Super Admin)
async function notifierPersonnel(message) {
  const ids = await userModel.findIdsByRoles(STAFF);
  await notifModel.insertNotificationsInApp(ids, message);
  return ids.length;
}

// Notification in-app + e-mail à un étudiant.
// L'in-app part toujours ; un échec d'e-mail (Gmail indisponible...) n'est pas bloquant :
// la fonction renvoie { emailEnvoye: false } pour que l'interface puisse le signaler.
async function notifierEtudiant({ id_utilisateur, email, message, sujet, contenuHtml, pieceJointe }) {
  await notifModel.insertNotificationInApp(id_utilisateur, message);
  if (!email) return { emailEnvoye: false };
  try {
    if (pieceJointe) {
      await notifierEmailAvecPieceJointe(id_utilisateur, email, sujet, contenuHtml, pieceJointe.chemin, pieceJointe.nom);
    } else {
      await notifierEmail(id_utilisateur, email, sujet, contenuHtml);
    }
    return { emailEnvoye: true };
  } catch (error) {
    console.error(`E-mail vers ${email} échoué :`, error.message);
    return { emailEnvoye: false };
  }
}

// Les fonctions suivantes filtrent toujours par id_utilisateur :
// on ne peut lire / supprimer que ses propres notifications
async function listerNotifications(id_utilisateur) {
  return await notifModel.notifFindByUtilisateur(id_utilisateur);
}

async function marquerCommeLue(id_notification, id_utilisateur) {
  return await notifModel.updateLu(id_notification, id_utilisateur);
}

async function supprimerNotification(id_notification, id_utilisateur) {
  return await notifModel.deleteNotification(id_notification, id_utilisateur);
}

// Prévient les étudiants mentionnés dans un commentaire ; renvoie le nombre de notifiés
async function notifierMention({ idSupport, mentions, auteur }) {
  if (!Array.isArray(mentions) || mentions.length === 0) return 0;

  const contexte = await notifModel.getContexteMention(idSupport, auteur.idUtilisateur);
  if (!contexte) return 0;

  // Les mentions sont des id_etudiant : on récupère les id_utilisateur correspondants
  const destinataires = await notifModel.getIdsUtilisateursEtudiants(mentions);
  if (destinataires.length === 0) return 0;

  const auteurNom = `${contexte.auteur_prenom} ${contexte.auteur_nom}`.trim();
  const message = `${auteurNom} vous a mentionné dans le support "${contexte.support_titre}" (${contexte.formation_nom}).`;
  await notifModel.insertNotificationsInApp(destinataires, message);
  return destinataires.length;
}

// Prévient l'auteur d'un commentaire qu'on lui a répondu
async function notifierReponse({ idDestinataire, idSupport, auteur }) {
  const contexte = await notifModel.getContexteMention(idSupport, auteur.idUtilisateur);
  if (!contexte) return;

  const auteurNom = `${contexte.auteur_prenom} ${contexte.auteur_nom}`.trim();
  const message = `${auteurNom} a répondu à votre commentaire sur le support "${contexte.support_titre}" (${contexte.formation_nom}).`;
  await notifModel.insertNotificationInApp(idDestinataire, message);
}

// Prévient le formateur qu'un étudiant a commenté un support de sa formation
async function notifierCommentaireFormateur({ idDestinataire, idSupport, auteur }) {
  const contexte = await notifModel.getContexteMention(idSupport, auteur.idUtilisateur);
  if (!contexte) return;

  const auteurNom = `${contexte.auteur_prenom} ${contexte.auteur_nom}`.trim();
  const message = `${auteurNom} a commenté le support "${contexte.support_titre}" (${contexte.formation_nom}).`;
  await notifModel.insertNotificationInApp(idDestinataire, message);
}

module.exports = {
  notifierPersonnel,
  notifierEtudiant,
  notifierMention,
  notifierReponse,
  notifierCommentaireFormateur,
  notifierInApp,
  notifierEmail,
  notifierEmailAvecPieceJointe,
  listerNotifications,
  marquerCommeLue,
  supprimerNotification,
};