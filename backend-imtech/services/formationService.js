const formationModel = require('../models/formationModel');

async function listerFormations() {
  return await formationModel.getAllFormations();
}

async function recupererFormation(id) {
  return await formationModel.getFormationById(id);
}

async function recupererEtudiantsFormation(id) {
  return await formationModel.getEtudiantsByFormation(id);
}

async function creerFormation({ nom, description, tarif, duree, duree_jours, id_utilisateur }) {
  if (duree_jours <= 0) {
    throw new Error('duree_jours doit être supérieur à 0.');
  }
  return await formationModel.insertFormation({ nom, description, tarif, duree, duree_jours, id_utilisateur });
}

async function modifierFormation(id, data) {
  if (data.duree_jours !== undefined && data.duree_jours <= 0) {
    throw new Error('duree_jours doit être supérieur à 0.');
  }
  return await formationModel.updateFormation(id, data);
}

async function supprimerFormation(id) {
  return await formationModel.deleteFormation(id);
}

module.exports = {
  listerFormations, recupererFormation, recupererEtudiantsFormation,
  creerFormation, modifierFormation, supprimerFormation
};