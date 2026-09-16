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

async function getAllPaiements() {
  const sql = `
    SELECT p.id_paiement, p.id_echeance, p.id_mode_paiement, p.montant,
      p.date_paiement, p.reference_virement, p.etat,
      mp.nom AS mode_paiement, e.id_inscription,
      u.id_utilisateur AS id_utilisateur_etudiant, u.email AS email_etudiant,
      u.nom AS etudiant_nom, u.prenom AS etudiant_prenom,
      f.nom AS formation_nom
    FROM paiement p
    LEFT JOIN mode_paiement mp ON p.id_mode_paiement = mp.id_mode_paiement
    JOIN echeance e ON p.id_echeance = e.id_echeance
    JOIN inscription i ON e.id_inscription = i.id_inscription
    JOIN etudiant et ON i.id_etudiant = et.id_etudiant
    JOIN utilisateur u ON et.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    ORDER BY p.date_paiement DESC, p.id_paiement DESC
  `;
  const [rows] = await db.query(sql);
  return rows;
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
  getPaiementById,
  getAllPaiements
  
};