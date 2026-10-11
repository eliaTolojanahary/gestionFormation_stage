// Controller des notifications : in-app (lues dans l'application) et e-mails.
const notifService = require('../services/notifService');
const { exigerChamps, notFound, badRequest } = require('../utils/errors');

// Nom et e-mail de l'utilisateur connecté, affichés comme expéditeur des e-mails
function getExpediteur(req) {
  return {
    nom: `${req.user.prenom || ''} ${req.user.nom || ''}`.trim() || req.user.email,
    email: req.user.email,
  };
}

// GET /notifications : notifications de l'utilisateur connecté
async function listerNotifications(req, res) {
  const notifications = await notifService.listerNotifications(req.user.id);
  res.json({ status: 'success', data: notifications });
}

// PUT /notifications/:id/lu (404 si la notification n'appartient pas à l'utilisateur)
async function lireNotification(req, res) {
  const ok = await notifService.marquerCommeLue(req.params.id, req.user.id);
  if (!ok) throw notFound('Notification introuvable.');
  res.json({ status: 'success', message: 'Notification marquée comme lue.' });
}

// DELETE /notifications/:id
async function retirerNotification(req, res) {
  const ok = await notifService.supprimerNotification(req.params.id, req.user.id);
  if (!ok) throw notFound('Notification introuvable.');
  res.json({ status: 'success', message: 'Notification supprimée.' });
}

// POST /notifications/in-app (personnel)
async function envoyerNotifInApp(req, res) {
  exigerChamps(req.body, ['id_destinataire', 'message']);
  await notifService.notifierInApp(req.body.id_destinataire, req.body.message);
  res.status(201).json({ status: 'success', message: 'Notification in-app envoyée.' });
}

// POST /notifications/email (personnel)
async function envoyerEmailController(req, res) {
  exigerChamps(req.body, ['email', 'sujet', 'contenuHtml']);
  const { id_destinataire, email, sujet, contenuHtml } = req.body;

  await notifService.notifierEmail(id_destinataire, email, sujet, contenuHtml, getExpediteur(req));
  res.json({ status: 'success', message: 'E-mail envoyé avec succès.' });
}

// POST /notifications/email/piece-jointe (personnel) : multipart avec le champ piece_jointe
async function envoyerEmailPieceJointeController(req, res) {
  exigerChamps(req.body, ['email', 'sujet', 'contenuHtml']);
  if (!req.file) throw badRequest('Pièce jointe manquante.');
  const { id_destinataire, email, sujet, contenuHtml } = req.body;

  await notifService.notifierEmailAvecPieceJointe(
    id_destinataire, email, sujet, contenuHtml,
    req.file.path, req.file.originalname, getExpediteur(req)
  );
  res.json({ status: 'success', message: 'E-mail avec pièce jointe envoyé.' });
}

module.exports = {
  listerNotifications,
  lireNotification,
  retirerNotification,
  envoyerNotifInApp,
  envoyerEmailController,
  envoyerEmailPieceJointeController,
};
