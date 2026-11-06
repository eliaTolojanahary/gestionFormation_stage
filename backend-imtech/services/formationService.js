// Service des formations.
const formationModel = require('../models/formationModel');
const etatService = require('./etatService');
const { ROLES, STAFF } = require('../config/roles');
const { lireEtat } = require('../utils/etat');
const { badRequest, forbidden, notFound } = require('../utils/errors');

// duree_jours sert à répartir les échéances : il doit être strictement positif s'il est fourni
function verifierDuree(duree_jours) {
  if (duree_jours !== undefined && !(Number(duree_jours) > 0)) {
    throw badRequest('duree_jours doit être supérieur à 0.');
  }
}

// Un formateur ne voit que ses propres formations ; seul le personnel peut demander
// les formations désactivées (etat = 'inactif' ou 'tous')
// Un formateur ne reçoit que ses formations ; ?etat= réservé au personnel.
// pagination { page, limite, offset } : une page + le total ; null : toute la liste
async function listerFormations(auteur, { etat, recherche } = {}, pagination = null) {
  const filtres = {
    idUtilisateur: auteur?.role === ROLES.FORMATEUR ? auteur.id : undefined,
    etat: lireEtat({ etat }, STAFF.includes(auteur?.role)),
    recherche,
  };
  if (!pagination) return await formationModel.getAllFormations(filtres);
  const [lignes, total] = await Promise.all([
    formationModel.getAllFormations(filtres, pagination),
    formationModel.compterFormations(filtres),
  ]);
  return { lignes, total };
}

async function recupererFormation(id) {
  const formation = await formationModel.getFormationById(id);
  if (!formation) throw notFound('Formation introuvable.');
  return formation;
}

// Un formateur ne peut lister que les étudiants de SES formations.
// filtres = { recherche } ; pagination = { page, limite, offset } ou null (toute la liste, sans total)
async function recupererEtudiantsFormation(id, auteur, filtres = {}, pagination = null) {
  const formation = await recupererFormation(id);
  if (auteur?.role === ROLES.FORMATEUR && Number(formation.id_utilisateur) !== Number(auteur.id)) {
    throw forbidden("Cette formation ne vous est pas attribuée.");
  }
  if (!pagination) return await formationModel.getEtudiantsByFormation(id, filtres);
  const [lignes, total] = await Promise.all([
    formationModel.getEtudiantsByFormation(id, filtres, pagination),
    formationModel.compterEtudiantsFormation(id, filtres),
  ]);
  return { lignes, total };
}

async function creerFormation({ nom, description, engagement_formateur, tarif, duree, duree_jours, id_utilisateur }) {
  verifierDuree(duree_jours);
  return await formationModel.insertFormation({ nom, description, engagement_formateur, tarif, duree, duree_jours, id_utilisateur });
}

async function modifierFormation(id, data) {
  verifierDuree(data.duree_jours);
  const ok = await formationModel.updateFormation(id, data);
  if (!ok) throw notFound('Formation introuvable.');
}

// Nouvelle couverture (image déjà enregistrée dans uploads/formations par multer)
async function modifierImageFormation(id, fichier) {
  if (!fichier) throw badRequest("Aucune image n'a été fournie.");
  const ok = await formationModel.updateImageFormation(id, `formations/${fichier.filename}`);
  if (!ok) throw notFound('Formation introuvable.');
  return `formations/${fichier.filename}`;
}

async function supprimerFormation(id) {
  await etatService.desactiverFormation(id);
}

module.exports = {
  listerFormations, recupererFormation, recupererEtudiantsFormation,
  creerFormation, modifierFormation, modifierImageFormation, supprimerFormation
};
