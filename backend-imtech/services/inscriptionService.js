const inscriptionModel = require('../models/inscriptionModel');
const { genererEcheancierTx } = require('../models/echeanceModel');

async function creerInscription({ id_etudiant, id_formation, nombre_tranches, id_tranche }) {
  const id_inscription = await inscriptionModel.insertInscription(id_etudiant, id_formation);
  const inscription = await inscriptionModel.findInscriptionAvecTarif(id_inscription);

  await genererEcheancierTx({
    id_inscription,
    tarifTotal: parseFloat(inscription.tarif),
    dureeJours: inscription.duree_jours,
    nombreTranches: parseInt(nombre_tranches, 10),
    id_Tranche: id_tranche
  });

  return id_inscription;
}

async function validerInscription(id_inscription) {
  return await inscriptionModel.setInscriptionValidee(id_inscription);
}

async function listerInscriptions() {
  return await inscriptionModel.getAllInscriptions();
}

async function recupererInscription(id) {
  return await inscriptionModel.getInscriptionById(id);
}

async function supprimerInscription(id) {
  return await inscriptionModel.deleteInscription(id);
}

module.exports = {
  creerInscription, validerInscription, listerInscriptions,
  recupererInscription, supprimerInscription
};