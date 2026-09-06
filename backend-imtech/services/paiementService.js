const paiementModel = require('../models/paiementModel');

async function enregistrerPaiement(id_echeance, id_mode_paiement, montant, reference_virement) {
  return await paiementModel.insererPaiement(id_echeance, id_mode_paiement, montant, reference_virement);
}

async function listerPaiementId(id_paiement) {
  return await paiementModel.getPaiementById(id_paiement);
}


async function modifierPaiement(id_paiement, data) {
  return await paiementModel.updatePaiement(id_paiement, data);
}
module.exports = {
  modifierPaiement, listerPaiementId, enregistrerPaiement
};