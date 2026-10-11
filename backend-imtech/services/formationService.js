// Service des formations.
const formationModel = require('../models/formationModel');
const { ROLES } = require('../config/roles');
const { badRequest, forbidden, notFound } = require('../utils/errors');

// duree_jours sert à répartir les échéances : il doit être strictement positif s'il est fourni
function verifierDuree(duree_jours) {
  if (duree_jours !== undefined && !(Number(duree_jours) > 0)) {
    throw badRequest('duree_jours doit être supérieur à 0.');
  }
}

// Un formateur ne voit que ses propres formations
async function listerFormations(auteur) {
  const idFormateur = auteur?.role === ROLES.FORMATEUR ? auteur.id : undefined;
  return await formationModel.getAllFormations(idFormateur);
}

async function recupererFormation(id) {
  const formation = await formationModel.getFormationById(id);
  if (!formation) throw notFound('Formation introuvable.');
  return formation;
}

// Un formateur ne peut lister que les étudiants de SES formations
async function recupererEtudiantsFormation(id, auteur) {
  const formation = await recupererFormation(id);
  if (auteur?.role === ROLES.FORMATEUR && Number(formation.id_utilisateur) !== Number(auteur.id)) {
    throw forbidden("Cette formation ne vous est pas attribuée.");
  }
  return await formationModel.getEtudiantsByFormation(id);
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

async function supprimerFormation(id) {
  const ok = await formationModel.deleteFormation(id);
  if (!ok) throw notFound('Formation introuvable.');
}

module.exports = {
  listerFormations, recupererFormation, recupererEtudiantsFormation,
  creerFormation, modifierFormation, supprimerFormation
};
