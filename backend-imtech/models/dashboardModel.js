const db = require('../config/db');

async function getKPI() {
  const sql = `
   SELECT 
  (SELECT IFNULL(SUM(montant), 0) FROM paiement WHERE etat = true) AS montant_encaisse,
  
  (SELECT COUNT(*) FROM formation WHERE etat = true) AS nombre_formations,
  
  (SELECT COUNT(*) FROM formation WHERE etat = true) AS formations_actives,
  
  (SELECT IFNULL(SUM(montant_prevu), 0) FROM echeance WHERE etat = true) 
  - (SELECT IFNULL(SUM(montant), 0) FROM paiement WHERE etat = true) AS reste_a_encaisser,
  
  (SELECT COUNT(DISTINCT e.id_echeance)
   FROM echeance e
   LEFT JOIN paiement p ON e.id_echeance = p.id_echeance
   WHERE e.etat = true
     AND CURDATE() > e.date_echeance
     AND IFNULL(p.montant, 0) < e.montant_prevu) AS paiements_en_retard
  `;
  const [rows] = await db.query(sql);
  return rows[0];
}

async function getEvolutionParJour(dateDebut) {
  const sql = `
    SELECT DATE(date_paiement) AS periode, SUM(montant) AS total
    FROM paiement
    WHERE etat = true AND date_paiement >= ?
    GROUP BY periode
    ORDER BY periode ASC
  `;
  const [rows] = await db.query(sql, [dateDebut]);
  return rows;
}

async function getEvolution(formatDate) {
  const sql = `
    SELECT DATE_FORMAT(date_paiement, ?) AS periode, SUM(montant) AS total
    FROM paiement
    WHERE etat = true
    GROUP BY periode
    ORDER BY periode ASC
  `;
  const [rows] = await db.query(sql, [formatDate]);
  return rows;
}

async function getDonneesInscriptions() {
  const sql = `
    SELECT i.id_inscription, u.nom, u.prenom, f.nom AS formation, 
           i.date_inscription, f.tarif
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.etat = true
  `;
  const [rows] = await db.query(sql);
  return rows;
}

      
async function getDonneesInscriptionsParMois() {
  const sql = `
  SELECT DATE_FORMAT(date_inscription, '%Y-%m') AS periode,
       COUNT(*) AS total
  FROM inscription
  WHERE etat = true
  GROUP BY periode
  ORDER BY periode ASC
  `;
  const [rows] = await db.query(sql);
  return rows;
}
async function getTopInscriptions() {
  const sql = `
    SELECT f.id_formation,
           f.nom AS formation,
           COUNT(i.id_inscription) AS total_inscriptions
    FROM formation f
    LEFT JOIN inscription i
      ON i.id_formation = f.id_formation AND i.etat = true
    WHERE f.etat = true
    GROUP BY f.id_formation, f.nom
    ORDER BY total_inscriptions DESC, f.nom ASC
    LIMIT 5
  `;
  const [rows] = await db.query(sql);
  return rows;
}
module.exports = {getTopInscriptions, getKPI,getEvolution, getEvolutionParJour, getDonneesInscriptions,getDonneesInscriptionsParMois };