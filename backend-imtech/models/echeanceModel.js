// Model des échéances (tranches de paiement prévues pour une inscription).
const db = require('../config/db');
const { PAIEMENT_VALIDE, PAIEMENT_ACTIF } = require('./paiementModel');

// Les constantes ci-dessous sont des morceaux de SQL réutilisés dans plusieurs requêtes
// (paramètre `alias` = alias de la table echeance dans la requête).

// Montant envoyé par l'étudiant sur une échéance (validé + en attente de validation)
const MONTANT_ENVOYE = (alias = 'e') => `COALESCE((
  SELECT SUM(pa.montant) FROM paiement pa
  WHERE pa.id_echeance = ${alias}.id_echeance AND ${PAIEMENT_ACTIF('pa')}
), 0)`;

// Statut d'une échéance (un paiement envoyé compte, même pas encore validé) :
//   VERT  : payée, ou date encore loin (plus de 2 jours)
//   JAUNE : J-2, J-1 ou le jour J  → l'Accueil est notifié et peut envoyer un rappel
//   ROUGE : date dépassée
// Règle unique, utilisée par la page Échéances ET par l'alerte automatique envoyée à l'Accueil.
const ECHEANCE_PROCHE = (alias = 'e') => `DATEDIFF(${alias}.date_echeance, CURDATE()) BETWEEN 0 AND 2`;

// Insertion groupée : `values` est un tableau de lignes [id_inscription, id_tranche, montant, date, genere_auto, etat]
async function insertEcheances(connection, values) {
  const sql = `INSERT INTO echeance (id_inscription, id_tranche, montant_prevu, date_echeance, genere_auto, etat) VALUES ?`;
  await connection.query(sql, [values]);
}

// Échéances d'une inscription, de la plus proche à la plus lointaine
async function getEcheancesByInscription(id_inscription, connection = db) {
  const sql = `
    SELECT e.*, t.nom AS tranche_nom, t.code AS tranche_code
    FROM echeance e
    LEFT JOIN tranche t ON e.id_tranche = t.id_tranche
    WHERE e.id_inscription = ?
    ORDER BY e.date_echeance ASC
  `;
  const [rows] = await connection.query(sql, [id_inscription]);
  return rows;
}

// Toutes les échéances actives pour la page Échéances : montant payé (validé), reste à payer,
// montant en attente de validation et statut de couleur (VERT / JAUNE / ROUGE)
async function getAllEcheances() {
  const sql = `
    SELECT 
      e.id_echeance, e.id_inscription, e.montant_prevu, e.date_echeance,
      e.etat AS echeance_active, e.date_dernier_rappel,
      u.id_utilisateur AS id_utilisateur_etudiant, u.email AS email_etudiant,
      u.nom AS etudiant_nom, u.prenom AS etudiant_prenom,
      f.nom AS formation_nom,
      IFNULL(SUM(p.montant), 0) AS montant_paye,
      (e.montant_prevu - IFNULL(SUM(p.montant), 0)) AS reste_a_payer,
      ${MONTANT_ENVOYE()} - IFNULL(SUM(p.montant), 0) AS montant_en_attente,
      CASE
        WHEN ${MONTANT_ENVOYE()} >= e.montant_prevu THEN 'VERT'
        WHEN CURDATE() > e.date_echeance THEN 'ROUGE'
        WHEN ${ECHEANCE_PROCHE()} THEN 'JAUNE'
        ELSE 'VERT'
      END AS statut_paiement
    FROM echeance e
    JOIN inscription i ON e.id_inscription = i.id_inscription
    JOIN etudiant et ON i.id_etudiant = et.id_etudiant
    JOIN utilisateur u ON et.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    LEFT JOIN paiement p ON e.id_echeance = p.id_echeance AND ${PAIEMENT_VALIDE()}
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
  const [result] = await db.query(sql, [montant_prevu ?? null, date_echeance ?? null, etat ?? null, id_echeance]);
  return result.affectedRows > 0;
}

// Échéance + étudiant + reste à payer (paiements validés), pour envoyer un rappel.
// reste_non_envoye = montant prévu - (validé + en attente) : ce que l'étudiant n'a pas encore payé du tout
async function getEcheancePourRappel(id_echeance) {
  const sql = `
    SELECT e.id_echeance, e.montant_prevu, e.date_echeance,
           u.id_utilisateur, u.email, u.nom, u.prenom, f.nom AS formation_nom,
           e.montant_prevu - COALESCE((
             SELECT SUM(p.montant) FROM paiement p
             WHERE p.id_echeance = e.id_echeance AND ${PAIEMENT_VALIDE()}
           ), 0) AS reste_a_payer,
           e.montant_prevu - ${MONTANT_ENVOYE()} AS reste_non_envoye
    FROM echeance e
    JOIN inscription i ON i.id_inscription = e.id_inscription
    JOIN etudiant et ON et.id_etudiant = i.id_etudiant
    JOIN utilisateur u ON u.id_utilisateur = et.id_utilisateur
    JOIN formation f ON f.id_formation = i.id_formation
    WHERE e.id_echeance = ? AND e.etat = true AND i.etat = true
  `;
  const [rows] = await db.query(sql, [id_echeance]);
  return rows[0] || null;
}

// Mémorise la date du dernier rappel (renvoyée par getAllEcheances)
async function marquerRappelEnvoye(id_echeance) {
  await db.query('UPDATE echeance SET date_dernier_rappel = NOW() WHERE id_echeance = ?', [id_echeance]);
}

module.exports = {
  ECHEANCE_PROCHE,
  MONTANT_ENVOYE,
  insertEcheances, getEcheancesByInscription, getAllEcheances, updateEcheance,
  getEcheancePourRappel, marquerRappelEnvoye,
};