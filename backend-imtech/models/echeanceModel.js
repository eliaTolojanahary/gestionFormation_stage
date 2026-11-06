// Model des échéances (tranches de paiement prévues pour une inscription).
const db = require('../config/db');
const { PAIEMENT_VALIDE, PAIEMENT_ACTIF } = require('./paiementModel');
const { clauseLimite } = require('../utils/pagination');
const { conditionEtudiantOuFormation } = require('../utils/recherche');
const { conditionEtat } = require('../utils/etat');
const { conditionPeriode, paramsPeriode } = require('../utils/periode');

// Les constantes ci-dessous sont des morceaux de SQL réutilisés dans plusieurs requêtes
// (paramètre `alias` = alias de la table echeance dans la requête).

// Les sommes de paiements d'une échéance sont lues entièrement dans l'index
// idx_paiement_echeance_somme (id_echeance, etat, statut, montant), sans lire la table paiement.

// Montant envoyé par l'étudiant sur une échéance (validé + en attente de validation)
const MONTANT_ENVOYE = (alias = 'e') => `COALESCE((
  SELECT SUM(pa.montant) FROM paiement pa
  WHERE pa.id_echeance = ${alias}.id_echeance AND ${PAIEMENT_ACTIF('pa')}
), 0)`;

// Montant validé par l'Accueil sur une échéance
const MONTANT_VALIDE = (alias = 'e') => `COALESCE((
  SELECT SUM(pv.montant) FROM paiement pv
  WHERE pv.id_echeance = ${alias}.id_echeance AND ${PAIEMENT_VALIDE('pv')}
), 0)`;

// Statut d'une échéance (un paiement envoyé compte, même pas encore validé) :
//   VERT  : payée, ou date encore loin (plus de 2 jours)
//   JAUNE : J-2, J-1 ou le jour J  → l'Accueil est notifié et peut envoyer un rappel
//   ROUGE : date dépassée
// Règle unique, utilisée par la page Échéances ET par l'alerte automatique envoyée à l'Accueil.
// Écrite sur la colonne seule (pas de DATEDIFF) pour que l'index sur date_echeance serve.
const ECHEANCE_PROCHE = (alias = 'e') =>
  `${alias}.date_echeance BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 2 DAY)`;

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

// Couleur de suivi d'une échéance (même règle que la page Échéances) :
// VERT = payée (paiements envoyés >= montant) ou encore loin, ROUGE = en retard, JAUNE = J-2 à J
// `envoye` = expression du montant envoyé (déjà calculé : colonne d'une sous-requête)
const STATUT_ECHEANCE = (alias = 'e', envoye = MONTANT_ENVOYE(alias)) => `CASE
        WHEN ${envoye} >= ${alias}.montant_prevu THEN 'VERT'
        WHEN CURDATE() > ${alias}.date_echeance THEN 'ROUGE'
        WHEN ${ECHEANCE_PROCHE(alias)} THEN 'JAUNE'
        ELSE 'VERT'
      END`;

// Filtre par couleur : même règle que STATUT_ECHEANCE, mais la condition sur la date vient
// d'abord. Elle utilise l'index : seules les échéances candidates voient leurs paiements sommés.
const CONDITION_STATUT = {
  ROUGE: `e.date_echeance < CURDATE() AND ${MONTANT_ENVOYE()} < e.montant_prevu`,
  JAUNE: `${ECHEANCE_PROCHE()} AND ${MONTANT_ENVOYE()} < e.montant_prevu`,
  VERT: `(e.date_echeance > DATE_ADD(CURDATE(), INTERVAL 2 DAY) OR ${MONTANT_ENVOYE()} >= e.montant_prevu)`,
};

const FROM_ECHEANCES = `
    FROM echeance e
    JOIN inscription i ON e.id_inscription = i.id_inscription
    JOIN etudiant et ON i.id_etudiant = et.id_etudiant
    JOIN utilisateur u ON et.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation`;

// Filtres de la liste : recherche (étudiant ou formation), couleur de suivi (VERT / JAUNE / ROUGE),
// état de l'échéance (actif par défaut), période sur la date d'échéance (tableau de bord)
function filtresEcheances({ recherche, statut, etat, periode } = {}) {
  const conditions = [conditionEtat('e.etat', etat)].filter(Boolean);
  const params = [];
  if (recherche) {
    const condition = conditionEtudiantOuFormation('i.id_etudiant', 'i.id_formation', recherche);
    conditions.push(condition.sql);
    params.push(...condition.params);
  }
  if (statut) {
    conditions.push(CONDITION_STATUT[statut] || '1 = 0'); // couleur inconnue : aucune échéance
  }
  if (periode && (periode.debut || periode.fin)) {
    conditions.push(conditionPeriode('e.date_echeance'));
    params.push(...paramsPeriode(periode));
  }
  return { where: conditions.join(' AND ') || '1 = 1', params };
}

// Échéances avec montant payé / restant et couleur de suivi, par date ;
// `pagination` = page demandée (ou null : toutes).
// La sous-requête `page` choisit d'abord les lignes (parcours de l'index sur date_echeance,
// arrêt après `limite`), les montants ne sont ensuite calculés que pour ces lignes.
async function getAllEcheances(filtres = {}, pagination = null) {
  const { where, params } = filtresEcheances(filtres);
  const limite = clauseLimite(pagination);
  const sql = `
    SELECT page.*,
      page.montant_prevu - page.montant_paye AS reste_a_payer,
      page.montant_envoye - page.montant_paye AS montant_en_attente,
      ${STATUT_ECHEANCE('page', 'page.montant_envoye')} AS statut_paiement
    FROM (
      SELECT
        e.id_echeance, e.id_inscription, e.montant_prevu, e.date_echeance,
        e.etat AS echeance_active, e.date_dernier_rappel,
        i.etat AS inscription_active, et.etat AS etudiant_actif, f.etat AS formation_active,
        u.id_utilisateur AS id_utilisateur_etudiant, u.email AS email_etudiant,
        u.nom AS etudiant_nom, u.prenom AS etudiant_prenom,
        f.nom AS formation_nom,
        ${MONTANT_VALIDE()} AS montant_paye,
        ${MONTANT_ENVOYE()} AS montant_envoye
      ${FROM_ECHEANCES}
      WHERE ${where}
      ORDER BY e.date_echeance ASC, e.id_echeance ASC${limite.sql}
    ) page
    ORDER BY page.date_echeance ASC, page.id_echeance ASC
  `;
  const [rows] = await db.query(sql, [...params, ...limite.params]);
  return rows.map(({ montant_envoye, ...ligne }) => ligne);
}

// Nombre d'échéances correspondant aux mêmes filtres (total de la pagination).
// Chaque échéance a son inscription, son étudiant et sa formation : seule la recherche lit
// l'inscription, sinon on compte sur la seule table echeance.
async function compterEcheances(filtres = {}) {
  const { where, params } = filtresEcheances(filtres);
  const depuis = filtres.recherche
    ? 'FROM echeance e JOIN inscription i ON e.id_inscription = i.id_inscription'
    : 'FROM echeance e';
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${depuis} WHERE ${where}`, params);
  return Number(total);
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
           e.montant_prevu - ${MONTANT_VALIDE()} AS reste_a_payer,
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
  MONTANT_VALIDE,
  insertEcheances, getEcheancesByInscription, getAllEcheances, compterEcheances, updateEcheance,
  getEcheancePourRappel, marquerRappelEnvoye,
};