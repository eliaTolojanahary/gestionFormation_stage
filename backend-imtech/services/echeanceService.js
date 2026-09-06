const db = require('../config/db');
const echeanceModel = require('../models/echeanceModel');

async function genererEcheancier({ id_inscription, tarifTotal, dureeJours, nombreTranches, id_Tranche }) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const intervalle = Math.floor(dureeJours / nombreTranches);
    const montantParTranche = Math.round((tarifTotal / nombreTranches) * 100) / 100;

    const values = [];
    for (let n = 1; n <= nombreTranches; n++) {
      const dateEcheance = new Date();
      dateEcheance.setDate(dateEcheance.getDate() + intervalle * n);

      values.push([
        id_inscription,
        id_Tranche,
        montantParTranche,
        dateEcheance.toISOString().split('T')[0],
        true,  // genere_auto
        true   // etat
      ]);
    }

    await echeanceModel.insertEcheances(connection, values);
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function listerEcheancesInscription(id_inscription) {
  return await echeanceModel.getEcheancesByInscription(id_inscription);
}

async function listerToutesEcheances() {
  return await echeanceModel.getAllEcheances();
}

async function modifierEcheance(id_echeance, data) {
  return await echeanceModel.updateEcheance(id_echeance, data);
}

module.exports = {
  genererEcheancier, listerEcheancesInscription, listerToutesEcheances, modifierEcheance
};