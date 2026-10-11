// Service des supports de cours (publication immédiate ou programmée).
const supportModel = require('../models/supportModel');
const formationModel = require('../models/formationModel');
const supportProgrammeService = require('./supportProgrammeService');
const { ROLES } = require('../config/roles');
const { badRequest, conflict, forbidden, notFound } = require('../utils/errors');

async function listerSupportsFormation(id_formation) {
  return await supportModel.getSupportsByFormation(id_formation);
}

async function recupererSupport(id_support) {
  const support = await supportModel.getSupportById(id_support);
  if (!support) throw notFound('Support introuvable.');
  return support;
}

// Heure d'envoi programmé : absente = envoi immédiat ; sinon une date valide dans le futur.
// Le formulaire web envoie l'heure locale, ex. "2026-10-10T14:30".
function lireDateEnvoi(valeur, maintenant = new Date()) {
  if (valeur === undefined || valeur === null || String(valeur).trim() === '') return null;
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) throw badRequest("La date d'envoi est invalide.");
  if (date <= maintenant) throw badRequest("La date d'envoi programmé doit être dans le futur.");
  return date;
}

// Un formateur ne publie que dans SES formations
async function creerSupports({ id_formation, titre, fichiers, date_envoi_prevue }, auteur) {
  const formation = await formationModel.getFormationById(id_formation);
  if (!formation) throw notFound('Formation introuvable.');
  if (auteur.role === ROLES.FORMATEUR && Number(formation.id_utilisateur) !== Number(auteur.id)) {
    throw forbidden("Cette formation ne vous est pas attribuée.");
  }
  const dateEnvoi = lireDateEnvoi(date_envoi_prevue);

  // Un support par fichier ; sans titre, on prend le nom du fichier
  const ids = [];
  for (const fichier of fichiers) {
    const support = {
      id_formation,
      id_utilisateur: auteur.id,
      titre: titre?.trim() || fichier.originalname,
      fichier: `supports/${fichier.filename}`,
      date_envoi_prevue: dateEnvoi,
    };
    ids.push(await supportModel.createSupport(support));

    // Envoi immédiat : les étudiants inscrits sont prévenus tout de suite.
    // Envoi programmé : le planificateur les préviendra 1 h avant, puis à l'envoi.
    if (!dateEnvoi) {
      await supportProgrammeService.notifierSupportEnvoye({ ...support, nom_formation: formation.nom });
    }
  }
  return { ids, programme: Boolean(dateEnvoi) };
}

// Supports programmés pas encore envoyés : les siens pour un formateur, tous pour le Super Admin
async function listerSupportsProgrammes(auteur) {
  return await supportModel.getSupportsProgrammes(auteur.role === ROLES.SUPER_ADMIN ? null : auteur.id);
}

// Brouillon modifiable par son auteur (ou le Super Admin) tant qu'il n'est pas envoyé
async function recupererBrouillon(id_support, auteur) {
  const support = await supportModel.getSupportProgramme(id_support);
  if (!support) {
    if (await supportModel.getSupportById(id_support)) {
      throw conflict('Ce support a déjà été envoyé : il ne peut plus être modifié.');
    }
    throw notFound('Support programmé introuvable.');
  }
  if (auteur.role !== ROLES.SUPER_ADMIN && Number(support.id_utilisateur) !== Number(auteur.id)) {
    throw forbidden('Vous ne pouvez modifier que vos propres supports.');
  }
  return support;
}

// Modifie le titre, le fichier et / ou l'heure d'envoi d'un support programmé
async function modifierSupportProgramme(id_support, { titre, fichier, date_envoi_prevue }, auteur) {
  await recupererBrouillon(id_support, auteur);
  const nouveauTitre = titre === undefined ? null : String(titre).trim();
  if (nouveauTitre === '') throw badRequest('Le titre ne peut pas être vide.');

  await supportModel.updateSupportProgramme(id_support, {
    titre: nouveauTitre,
    fichier: fichier ? `supports/${fichier.filename}` : null,
    date_envoi_prevue: lireDateEnvoi(date_envoi_prevue),
  });
  return await supportModel.getSupportProgramme(id_support);
}

// « Envoyer maintenant » : publie le brouillon sans attendre l'heure prévue
async function envoyerMaintenant(id_support, auteur) {
  const support = await recupererBrouillon(id_support, auteur);
  if (!(await supportProgrammeService.publier(support))) {
    throw conflict('Ce support a déjà été envoyé.');
  }
}

// Super Admin : tout ; Formateur : uniquement ses propres supports (publiés ou programmés)
async function supprimerSupport(id_support, auteur) {
  const support = await supportModel.getSupportPourSuppression(id_support);
  if (!support) throw notFound('Support introuvable.');
  if (auteur.role === ROLES.FORMATEUR && Number(support.id_utilisateur) !== Number(auteur.id)) {
    throw forbidden('Vous ne pouvez supprimer que vos propres supports.');
  }
  await supportModel.deleteSupport(id_support);
}

module.exports = {
  supprimerSupport,
  listerSupportsFormation,
  recupererSupport,
  creerSupports,
  lireDateEnvoi,
  listerSupportsProgrammes,
  modifierSupportProgramme,
  envoyerMaintenant,
};
