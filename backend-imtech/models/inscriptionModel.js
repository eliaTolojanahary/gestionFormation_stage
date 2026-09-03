const db = require('../config/db');

// 1. Créer l'inscription
async function createInscription(id_etudiant, id_formation) {
  const sql = `
    INSERT INTO inscription (id_etudiant, id_formation, date_inscription, etat) 
    VALUES (?, ?, CURDATE(), true)
  `;
  const [result] = await db.query(sql, [id_etudiant, id_formation]);
  return result.insertId;
}

// 2. Récupérer l'inscription avec tarif ET durée de la formation
async function findInscriptionAvecTarif(id_inscription) {
  const sql = `
    SELECT i.id_inscription, i.id_etudiant, i.id_formation, i.etat,
           f.tarif, f.duree_jours
    FROM inscription i
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.id_inscription = ?
  `;
  const [rows] = await db.query(sql, [id_inscription]);
  return rows[0];
}

// 3. Générer l'échéancier automatiquement, à partir de la vraie durée de la formation
async function genererEcheancierTx({ id_inscription, tarifTotal, dureeJours, nombreTranches, idTranche }) {
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
        idTranche,
        montantParTranche,
        dateEcheance.toISOString().split('T')[0],
        true,  // genere_auto
        true   // etat
      ]);
    }

    const sqlEcheance = `
      INSERT INTO echeance (id_inscription, id_tranche, montant_prevu, date_echeance, genere_auto, etat) 
      VALUES ?
    `;
    await connection.query(sqlEcheance, [values]);

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 4. Enregistrer un paiement, lié à une échéance précise (pas à l'inscription directement)
async function enregistrerPaiement({ id_echeance, id_mode_paiement, montant, reference_virement }) {
  const sql = `
    INSERT INTO paiement (id_echeance, id_mode_paiement, montant, date_paiement, reference_virement, etat)
    VALUES (?, ?, ?, CURDATE(), ?, true)
  `;
  const [result] = await db.query(sql, [id_echeance, id_mode_paiement, montant, reference_virement || null]);
  return result.insertId;
}

module.exports = {
  createInscription,
  findInscriptionAvecTarif,
  genererEcheancierTx,
  enregistrerPaiement
};