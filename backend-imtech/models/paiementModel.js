const db = require('../config/db');

async function insererPaiement( id_echeance, id_mode_paiement, montant, reference_virement ) {
  const sql = `
    INSERT INTO paiement (id_echeance, id_mode_paiement, montant, date_paiement, reference_virement, etat)
    VALUES (?, ?, ?, CURDATE(), ?, true)
  `;
  const [result] = await db.query(sql, [id_echeance, id_mode_paiement, montant, reference_virement || null]);
  return result.insertId;
}

async function getPaiementById(id_paiement) {
  const sql = `
    SELECT p.*, mp.nom AS mode_paiement, e.id_inscription
    FROM paiement p
    LEFT JOIN mode_paiement mp ON p.id_mode_paiement = mp.id_mode_paiement
    JOIN echeance e ON p.id_echeance = e.id_echeance
    WHERE p.id_paiement = ?
  `;
  const [rows] = await db.query(sql, [id_paiement]);
  return rows[0];
}


async function updatePaiement(id_paiement, data) {
  const { id_mode_paiement, montant, reference } = data;
  const sql = `
    UPDATE paiement 
    SET id_mode_paiement = COALESCE(?, id_mode_paiement),
        montant = COALESCE(?, montant),
        reference_virement = COALESCE(?, reference_virement)
    WHERE id_paiement = ?
  `;
  const [result] = await db.query(sql, [id_mode_paiement, montant, reference, id_paiement]);
  return result.affectedRows > 0;
}

module.exports = {
  insererPaiement,
  updatePaiement,
  getPaiementById
  
};