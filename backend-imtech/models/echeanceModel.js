const db = require('../config/db');

async function insertEcheances(connection, values) {
  const sql = `INSERT INTO echeance (id_inscription, id_tranche, montant_prevu, date_echeance, genere_auto, etat) VALUES ?`;
  await connection.query(sql, [values]);
}

async function getEcheancesByInscription(id_inscription) {
  const sql = `
    SELECT e.*, t.nom AS tranche_nom, t.code AS tranche_code
    FROM echeance e
    LEFT JOIN tranche t ON e.id_tranche = t.id_tranche
    WHERE e.id_inscription = ?
    ORDER BY e.date_echeance ASC
  `;
  const [rows] = await db.query(sql, [id_inscription]);
  return rows;
}

async function getAllEcheances() {
  const sql = `
    SELECT 
      e.id_echeance, e.id_inscription, e.montant_prevu, e.date_echeance,
      e.etat AS echeance_active,
      u.id_utilisateur AS id_utilisateur_etudiant, u.email AS email_etudiant,
      u.nom AS etudiant_nom, u.prenom AS etudiant_prenom,
      f.nom AS formation_nom,
      IFNULL(SUM(p.montant), 0) AS montant_paye,
      (e.montant_prevu - IFNULL(SUM(p.montant), 0)) AS reste_a_payer,
      CASE
        WHEN IFNULL(SUM(p.montant), 0) >= e.montant_prevu THEN 'VERT'
        WHEN CURRENT_DATE() > e.date_echeance THEN 'ROUGE'
        WHEN CURRENT_DATE() = e.date_echeance THEN 'ORANGE'
        ELSE 'VERT'
      END AS statut_paiement,
      CASE
        WHEN IFNULL(SUM(p.montant), 0) < e.montant_prevu 
         AND DATEDIFF(e.date_echeance, CURRENT_DATE()) = 2 
        THEN true ELSE false
      END AS a_relancer_bientot
    FROM echeance e
    JOIN inscription i ON e.id_inscription = i.id_inscription
    JOIN etudiant et ON i.id_etudiant = et.id_etudiant
    JOIN utilisateur u ON et.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    LEFT JOIN paiement p ON e.id_echeance = p.id_echeance
    WHERE e.etat = true
    GROUP BY e.id_echeance
    ORDER BY e.date_echeance ASC
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function updateEcheance(id_echeance, { montant_prevu, date_echeance, etat }) {
  const sql = `
    UPDATE echeance 
    SET montant_prevu = COALESCE(?, montant_prevu),
        date_echeance = COALESCE(?, date_echeance),
        etat = COALESCE(?, etat)
    WHERE id_echeance = ?
  `;
  const [result] = await db.query(sql, [montant_prevu, date_echeance, etat, id_echeance]);
  return result.affectedRows > 0;
}

module.exports = { insertEcheances, getEcheancesByInscription, getAllEcheances, updateEcheance };