const inscriptionModel = require('../models/inscriptionModel');
const { genererEcheancier } = require('./echeanceService');
const {getEcheancesByInscription}=require('../models/echeanceModel')
const {insererPaiement}=require('../models/paiementModel')
async function creerInscription({ id_etudiant, id_formation, nombre_tranches, id_tranche }) {
  const id_inscription = await inscriptionModel.insertInscription(id_etudiant, id_formation);
  const inscription = await inscriptionModel.findInscriptionAvecTarif(id_inscription);

  await genererEcheancier({
    id_inscription,
    tarifTotal: parseFloat(inscription.tarif),
    dureeJours: inscription.duree_jours,
    nombreTranches: parseInt(nombre_tranches, 10),
    id_Tranche: id_tranche
  });

  return id_inscription;
}

async function validerInscription(id_inscription, id_mode_paiement, reference_virement) {
  const echeances = await getEcheancesByInscription(id_inscription);

  if (echeances.length === 0) {
    throw new Error('Aucune échéance trouvée pour cette inscription.');
  }

  const premiereEcheance = echeances[0];


  const id_paiement = await insererPaiement(
    premiereEcheance.id_echeance,
    id_mode_paiement,
    premiereEcheance.montant_prevu,
    reference_virement
  );


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