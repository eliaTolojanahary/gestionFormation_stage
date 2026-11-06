// Model du tableau de bord : requêtes statistiques (montants, formations, inscriptions).
const db = require('../config/db');
const { PAIEMENT_VALIDE } = require('./paiementModel');
const { MONTANT_VALIDE, MONTANT_ENVOYE } = require('./echeanceModel');
const { conditionPeriode, paramsPeriode } = require('../utils/periode');
const { LIMITE_EXPORT } = require('../utils/pagination');

// Indicateurs sur la période { debut, fin } (null = tout l'historique) :
//  - montant_encaisse    : paiements validés dont la date de paiement est dans la période
//  - le reste (getSituationEcheances) : échéances dont la date est dans la période
async function getKPI(periode = {}) {
  const sql = `
    SELECT
      (SELECT IFNULL(SUM(p.montant), 0) FROM paiement p
        WHERE ${PAIEMENT_VALIDE()} AND ${conditionPeriode('p.date_paiement')}) AS montant_encaisse,
      (SELECT COUNT(*) FROM formation WHERE etat = true) AS nombre_formations
  `;
  const [[ligne]] = await db.query(sql, paramsPeriode(periode));
  return {
    montant_encaisse: ligne.montant_encaisse,
    nombre_formations: ligne.nombre_formations,
    formations_actives: ligne.nombre_formations,
    ...(await getSituationEcheances(periode)),
  };
}

// Échéances de la période, lues UNE seule fois (les paiements de chacune sont sommés dans l'index
// idx_paiement_echeance_somme) :
//   reste_a_encaisser   : montants prévus - ce qui a déjà été validé dessus
//   paiements_en_retard : échéances dépassées dont le montant envoyé (validé + en attente) est insuffisant
// et le détail du reste à encaisser, dont la somme redonne reste_a_encaisser :
//   en attente de validation : envoyé par l'étudiant, pas encore validé par l'Accueil ;
//   en retard : rien d'envoyé alors que la date est passée ;  à venir : date pas encore arrivée.
async function getSituationEcheances(periode = {}) {
  const sql = `
    SELECT
      IFNULL(SUM(prevu), 0) - IFNULL(SUM(valide), 0) AS reste_a_encaisser,
      COUNT(CASE WHEN CURDATE() > date_echeance AND envoye < prevu THEN 1 END) AS paiements_en_retard,
      IFNULL(SUM(LEAST(envoye, prevu) - LEAST(valide, prevu)), 0) AS montant_en_attente,
      IFNULL(SUM(CASE WHEN CURDATE() > date_echeance THEN prevu - LEAST(envoye, prevu) ELSE 0 END), 0) AS montant_en_retard,
      IFNULL(SUM(CASE WHEN CURDATE() > date_echeance THEN 0 ELSE prevu - LEAST(envoye, prevu) END), 0) AS montant_a_venir,
      -- Nombre d'échéances concernées par chaque montant (une échéance en partie payée peut compter deux fois)
      COUNT(CASE WHEN LEAST(envoye, prevu) > LEAST(valide, prevu) THEN 1 END) AS nb_en_attente,
      COUNT(CASE WHEN CURDATE() > date_echeance AND envoye < prevu THEN 1 END) AS nb_en_retard,
      COUNT(CASE WHEN CURDATE() <= date_echeance AND envoye < prevu THEN 1 END) AS nb_a_venir
    FROM (
      SELECT e.montant_prevu AS prevu, e.date_echeance,
        ${MONTANT_VALIDE()} AS valide,
        ${MONTANT_ENVOYE()} AS envoye
      FROM echeance e
      WHERE e.etat = true AND ${conditionPeriode('e.date_echeance')}
    ) detail
  `;
  const [rows] = await db.query(sql, paramsPeriode(periode));
  return rows[0];
}

// Clé de regroupement de chaque période, en texte :
// jour 'AAAA-MM-JJ', semaine = son lundi 'AAAA-MM-JJ', mois 'AAAA-MM', année 'AAAA'
const CLE_PERIODE = {
  quotidien: "DATE_FORMAT(date_paiement, '%Y-%m-%d')",
  hebdomadaire: "DATE_FORMAT(DATE_SUB(DATE(date_paiement), INTERVAL WEEKDAY(date_paiement) DAY), '%Y-%m-%d')",
  mensuel: "DATE_FORMAT(date_paiement, '%Y-%m')",
  annuel: "DATE_FORMAT(date_paiement, '%Y')",
};

// Montants encaissés regroupés par jour, semaine, mois ou année, depuis `dateDebut` (null = tout)
async function getEvolution(periode, dateDebut) {
  const sql = `
    SELECT ${CLE_PERIODE[periode]} AS periode, SUM(montant) AS total
    FROM paiement p
    WHERE ${PAIEMENT_VALIDE()} AND (? IS NULL OR date_paiement >= ?)
    GROUP BY periode
    ORDER BY periode ASC
  `;
  const [rows] = await db.query(sql, [dateDebut, dateDebut]);
  return rows;
}

// Lignes de l'export CSV : LIMITE_EXPORT + 1 au plus (la ligne en trop indique que l'export est coupé)
async function getDonneesInscriptions() {
  const sql = `
    SELECT i.id_inscription, u.nom, u.prenom, f.nom AS formation, 
           i.date_inscription, f.tarif
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.etat = true
    ORDER BY i.id_inscription
    LIMIT ?
  `;
  const [rows] = await db.query(sql, [LIMITE_EXPORT + 1]);
  return rows;
}

      
// Nombre d'inscriptions par mois (format 'AAAA-MM'), inscriptions faites pendant la période { debut, fin }
async function getDonneesInscriptionsParMois(periode = {}) {
  const sql = `
  SELECT DATE_FORMAT(date_inscription, '%Y-%m') AS periode,
       COUNT(*) AS total
  FROM inscription
  WHERE etat = true AND ${conditionPeriode('date_inscription')}
  GROUP BY periode
  ORDER BY periode ASC
  `;
  const [rows] = await db.query(sql, paramsPeriode(periode));
  return rows;
}

// 5 formations les plus suivies, en ne comptant que les inscriptions faites pendant la période
// (LEFT JOIN : une formation sans inscrit compte 0)
async function getTopInscriptions(periode = {}) {
  const sql = `
    SELECT f.id_formation,
           f.nom AS formation,
           COUNT(i.id_inscription) AS total_inscriptions
    FROM formation f
    LEFT JOIN inscription i
      ON i.id_formation = f.id_formation AND i.etat = true AND ${conditionPeriode('i.date_inscription')}
    WHERE f.etat = true
    GROUP BY f.id_formation, f.nom
    ORDER BY total_inscriptions DESC, f.nom ASC
    LIMIT 5
  `;
  const [rows] = await db.query(sql, paramsPeriode(periode));
  return rows;
}
module.exports = {getTopInscriptions, getKPI,getEvolution, getDonneesInscriptions,getDonneesInscriptionsParMois };