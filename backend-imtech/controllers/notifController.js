// Controller des notifications : in-app (lues dans l'application) et e-mails.
const notifService = require('../services/notifService');
const { exigerChamps, notFound, badRequest } = require('../utils/errors');

// Coordonnées de l'utilisateur connecté : expéditeur et signature des e-mails
const getExpediteur = (req) => notifService.expediteurDe(req.user.id);

// Paramètre de requête entier positif facultatif (?limite=20) ; 400 s'il est invalide
function entierPositif(valeur, nom) {
  if (valeur === undefined || valeur === '') return undefined;
  const n = Number(valeur);
  if (!Number.isInteger(n) || n < 1) throw badRequest(`Paramètre ${nom} invalide.`);
  return n;
}

// GET /notifications : notifications de l'utilisateur connecté, les plus récentes d'abord.
// Paramètres facultatifs : ?limite=20, ?avant=<id> (plus anciennes), ?apres=<id> (nouvelles),
// ?nonLues=1. Sans paramètre : toute la liste.
async function listerNotifications(req, res) {
  const limite = entierPositif(req.query.limite, 'limite');
  const { notifications, meta } = await notifService.listerNotifications(req.user.id, {
    limite: limite && Math.min(limite, 100),
    avant: entierPositif(req.query.avant, 'avant'),
    apres: entierPositif(req.query.apres, 'apres'),
    nonLues: req.query.nonLues === '1' || req.query.nonLues === 'true',
  });
  res.json({ status: 'success', data: notifications, meta });
}

// GET /notifications/compteur : { total, nonLues } pour le badge de la cloche
async function compterNotifications(req, res) {
  const compteur = await notifService.compterNotifications(req.user.id);
  res.json({ status: 'success', data: compteur });
}

// PUT /notifications/lu-tout
async function lireToutesNotifications(req, res) {
  const nombre = await notifService.marquerToutCommeLu(req.user.id);
  res.json({ status: 'success', message: `${nombre} notification(s) marquée(s) comme lue(s).` });
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

  await notifService.notifierEmail(id_destinataire, email, sujet, contenuHtml, await getExpediteur(req));
  res.json({ status: 'success', message: 'E-mail envoyé avec succès.' });
}

// POST /notifications/email/piece-jointe (personnel) : multipart avec le champ piece_jointe
async function envoyerEmailPieceJointeController(req, res) {
  exigerChamps(req.body, ['email', 'sujet', 'contenuHtml']);
  if (!req.file) throw badRequest('Pièce jointe manquante.');
  const { id_destinataire, email, sujet, contenuHtml } = req.body;

  await notifService.notifierEmailAvecPieceJointe(
    id_destinataire, email, sujet, contenuHtml,
    req.file.path, req.file.originalname, await getExpediteur(req)
  );
  res.json({ status: 'success', message: 'E-mail avec pièce jointe envoyé.' });
}

module.exports = {
  listerNotifications,
  compterNotifications,
  lireToutesNotifications,
  lireNotification,
  retirerNotification,
  envoyerNotifInApp,
  envoyerEmailController,
  envoyerEmailPieceJointeController,
};
