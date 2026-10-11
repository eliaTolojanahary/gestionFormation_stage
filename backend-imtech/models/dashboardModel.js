// Model du tableau de bord : requêtes statistiques (montants, formations, inscriptions).
const db = require('../config/db');
const { PAIEMENT_VALIDE, PAIEMENT_ACTIF } = require('./paiementModel');

// Indicateurs en une seule requête :
//  - montant_encaisse    : somme des paiements validés
//  - reste_a_encaisser   : total des échéances - montant encaissé
//  - paiements_en_retard : échéances dépassées dont le montant envoyé (validé + en attente) est insuffisant
async function getKPI() {
  const sql = `
   SELECT 
  (SELECT IFNULL(SUM(p.montant), 0) FROM paiement p WHERE ${PAIEMENT_VALIDE()}) AS montant_encaisse,
  
  (SELECT COUNT(*) FROM formation WHERE etat = true) AS nombre_formations,
  
  (SELECT COUNT(*) FROM formation WHERE etat = true) AS formations_actives,
  
  (SELECT IFNULL(SUM(montant_prevu), 0) FROM echeance WHERE etat = true) 
  - (SELECT IFNULL(SUM(p.montant), 0) FROM paiement p WHERE ${PAIEMENT_VALIDE()}) AS reste_a_encaisser,
  
  (SELECT COUNT(DISTINCT e.id_echeance)
   FROM echeance e
   WHERE e.etat = true
     AND NOW() > e.date_echeance
     AND (SELECT IFNULL(SUM(p.montant), 0) FROM paiement p
          WHERE p.id_echeance = e.id_echeance AND ${PAIEMENT_ACTIF()}) < e.montant_prevu) AS paiements_en_retard
  `;
  const [rows] = await db.query(sql);
  return rows[0];
}

// Montants encaissés par jour depuis `dateDebut`
async function getEvolutionParJour(dateDebut) {
  const sql = `
    SELECT DATE(date_paiement) AS periode, SUM(montant) AS total
    FROM paiement p
    WHERE ${PAIEMENT_VALIDE()} AND date_paiement >= ?
    GROUP BY periode
    ORDER BY periode ASC
  `;
  const [rows] = await db.query(sql, [dateDebut]);
  return rows;
}

// Montants encaissés regroupés selon `formatDate` (ex. '%Y-%m' = par mois)
async function getEvolution(formatDate) {
  const sql = `
    SELECT DATE_FORMAT(date_paiement, ?) AS periode, SUM(montant) AS total
    FROM paiement p
    WHERE ${PAIEMENT_VALIDE()}
    GROUP BY periode
    ORDER BY periode ASC
  `;
  const [rows] = await db.query(sql, [formatDate]);
  return rows;
}

// Lignes de l'export CSV
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

      
// Nombre d'inscriptions par mois (format 'AAAA-MM')
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

// 5 formations les plus suivies (LEFT JOIN : une formation sans inscrit compte 0)
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