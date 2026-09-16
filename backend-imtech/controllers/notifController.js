const notifService = require('../services/notifService');

function getUserId(req) {
  return req.user?.id_utilisateur || req.user?.id;
}

function getExpediteur(req) {
  if (!req.user) return null;
  return {
    nom: `${req.user.prenom || ''} ${req.user.nom || ''}`.trim() || req.user.email,
    email: req.user.email,
  };
}

async function listerNotifications(req, res) {
  try {
    const id_utilisateur = getUserId(req);
    const notifications = await notifService.listerNotifications(id_utilisateur);
    
    return res.status(200).json({
      status: "success",
      data: notifications,
    });
  } catch (error) {
    console.error("Erreur listerNotifications :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function lireNotification(req, res) {
  try {
    const id_utilisateur = getUserId(req);
    const { id } = req.params;

    const ok = await notifService.marquerCommeLue(id, id_utilisateur);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Notification introuvable." });
    }

    return res.status(200).json({ status: "success", message: "Notification marquée comme lue." });
  } catch (error) {
    console.error("Erreur lireNotification :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function retirerNotification(req, res) {
  try {
    const id_utilisateur = getUserId(req);
    const { id } = req.params;

    const ok = await notifService.supprimerNotification(id, id_utilisateur);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Notification introuvable." });
    }

    return res.status(200).json({ status: "success", message: "Notification supprimée." });
  } catch (error) {
    console.error("Erreur retirerNotification :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function envoyerNotifInApp(req, res) {
  try {
    const { id_destinataire, message } = req.body;

    if (!id_destinataire || !message) {
      return res.status(400).json({ status: "error", message: "Champs requis manquants." });
    }

    await notifService.notifierInApp(id_destinataire, message);
    return res.status(201).json({ status: "success", message: "Notification in-app envoyée." });
  } catch (error) {
    console.error("Erreur envoyerNotifInApp :", error);
    return res.status(500).json({ status: "error", message: "Erreur serveur." });
  }
}

async function envoyerEmailController(req, res) {
  try {
    const { id_destinataire, email, sujet, contenuHtml } = req.body;

    if (!email || !sujet || !contenuHtml) {
      return res.status(400).json({ status: "error", message: "Champs requis manquants." });
    }

    const expediteur = getExpediteur(req);
    await notifService.notifierEmail(id_destinataire, email, sujet, contenuHtml, expediteur);

    return res.status(200).json({ status: "success", message: "E-mail envoyé avec succès." });
  } catch (error) {
    console.error("Erreur envoyerEmailController :", error);
    return res.status(500).json({ status: "error", message: "Erreur lors de l'envoi de l'e-mail." });
  }
}

async function envoyerEmailPieceJointeController(req, res) {
  try {
    const { id_destinataire, email, sujet, contenuHtml } = req.body;
    const file = req.file;

    if (!email || !sujet || !contenuHtml || !file) {
      return res.status(400).json({ status: "error", message: "Fichier ou champs requis manquants." });
    }

    const expediteur = getExpediteur(req);
    await notifService.notifierEmailAvecPieceJointe(
      id_destinataire,
      email,
      sujet,
      contenuHtml,
      file.path,
      file.originalname,
      expediteur
    );

    return res.status(200).json({ status: "success", message: "E-mail avec pièce jointe envoyé." });
  } catch (error) {
    console.error("Erreur envoyerEmailPieceJointeController :", error);
    return res.status(500).json({ status: "error", message: "Erreur lors de l'envoi de l'e-mail." });
  }
}

module.exports = {
  listerNotifications,
  lireNotification,
  retirerNotification,
  envoyerNotifInApp,
  envoyerEmailController,
  envoyerEmailPieceJointeController,
};