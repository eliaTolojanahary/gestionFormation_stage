// Service des demandes d'assistance : l'étudiant écrit, l'Accueil résout.
const assistanceModel = require('../models/assistanceModel');
const notifService = require('./notifService');
const { ROLES } = require('../config/roles');
const { badRequest, conflict, forbidden, notFound } = require('../utils/errors');

const LONGUEUR_MAX_OBJET = 150;

// Exécute une notification sans faire échouer l'action principale si elle plante
async function avertir(fn, contexte) {
  try {
    await fn();
  } catch (error) {
    console.warn(`Notification (${contexte}) échouée :`, error.message);
  }
}

// L'étudiant envoie une demande depuis le mobile ; l'Accueil est prévenu
async function creerDemande({ objet, contenu }, auteur) {
  if (!auteur.id_etudiant) throw forbidden('Profil étudiant introuvable.');
  const objetPropre = String(objet || '').trim();
  const contenuPropre = String(contenu || '').trim();
  if (!objetPropre || !contenuPropre) throw badRequest("L'objet et le message sont requis.");
  if (objetPropre.length > LONGUEUR_MAX_OBJET) {
    throw badRequest(`L'objet ne doit pas dépasser ${LONGUEUR_MAX_OBJET} caractères.`);
  }

  const id = await assistanceModel.insertAssistance({
    id_etudiant: auteur.id_etudiant,
    objet: objetPropre,
    contenu: contenuPropre,
  });

  const demande = await assistanceModel.getAssistanceById(id);
  await avertir(
    () => notifService.notifierPersonnel(
      `${demande.etudiant_prenom} ${demande.etudiant_nom} a envoyé une demande d'assistance : « ${objetPropre} ».`
    ),
    'nouvelle assistance'
  );
  return demande;
}

// Un étudiant ne voit que ses demandes ; le personnel voit tout
async function listerDemandes(auteur, { statut } = {}) {
  if (auteur.role === ROLES.ETUDIANT) {
    if (!auteur.id_etudiant) return [];
    return await assistanceModel.getAssistances({ id_etudiant: auteur.id_etudiant, statut });
  }
  return await assistanceModel.getAssistances({ statut });
}

// L'Accueil clique « Résoudre » : statut Résolu + notification in-app à l'étudiant
async function resoudreDemande(id_assistance, auteur) {
  const demande = await assistanceModel.getAssistanceById(id_assistance);
  if (!demande) throw notFound("Demande d'assistance introuvable.");
  if (demande.statut !== assistanceModel.STATUTS_ASSISTANCE.EN_ATTENTE) {
    throw conflict('Cette demande est déjà résolue.');
  }

  await assistanceModel.resoudreAssistance(id_assistance, auteur.id);
  await avertir(
    () => notifService.notifierInApp(
      demande.id_utilisateur_etudiant,
      `Votre demande d'assistance « ${demande.objet} » a été résolue.`
    ),
    'assistance résolue'
  );
  return await assistanceModel.getAssistanceById(id_assistance);
}

module.exports = { creerDemande, listerDemandes, resoudreDemande };
