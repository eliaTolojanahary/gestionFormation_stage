// Model des paiements. Un paiement porte sur une échéance et a un statut :
// en_attente (envoyé par l'étudiant) -> valide ou refuse (décision de l'Accueil).
const db = require('../config/db');

const STATUTS_PAIEMENT = Object.freeze({
  EN_ATTENTE: 'en_attente',
  VALIDE: 'valide',
  REFUSE: 'refuse',
});

// Condition SQL d'un paiement qui compte réellement (non supprimé ET validé).
// À utiliser partout où l'on calcule des montants encaissés.
const PAIEMENT_VALIDE = (alias = 'p') => `${alias}.etat = true AND ${alias}.statut = '${STATUTS_PAIEMENT.VALIDE}'`;

// Paiement envoyé (validé ou en attente de validation), hors refusés.
// Utilisé pour savoir si l'étudiant a payé À TEMPS : c'est la date d'ENVOI qui compte,
// pas la date de validation par l'Accueil.
const PAIEMENT_ACTIF = (alias = 'p') => `${alias}.etat = true AND ${alias}.statut IN ('${STATUTS_PAIEMENT.VALIDE}', '${STATUTS_PAIEMENT.EN_ATTENTE}')`;

// Colonnes communes aux listes de paiements (avec l'étudiant et la formation)
const SELECT_PAIEMENT_DETAILLE = `
  SELECT p.id_paiement, p.id_echeance, p.id_mode_paiement, p.montant,
    p.date_paiement, p.reference_virement, p.statut, p.etat,
    mp.nom AS mode_paiement, e.id_inscription, e.montant_prevu, e.date_echeance,
    i.id_etudiant, i.id_formation,
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
`;

// Insère un paiement daté de maintenant (statut VALIDE par défaut)
async function insererPaiement(
  { id_echeance, id_mode_paiement, montant, reference_virement, statut = STATUTS_PAIEMENT.VALIDE },
  connection = db
) {
  const sql = `
    INSERT INTO paiement (id_echeance, id_mode_paiement, montant, date_paiement, reference_virement, statut, etat)
    VALUES (?, ?, ?, NOW(), ?, ?, true)
  `;
  const [result] = await connection.query(sql, [
    id_echeance, id_mode_paiement, montant, reference_virement || null, statut,
  ]);
  return result.insertId;
}

async function getPaiementById(id_paiement) {
  const [rows] = await db.query(`${SELECT_PAIEMENT_DETAILLE} WHERE p.id_paiement = ? AND p.etat = true`, [id_paiement]);
  return rows[0] || null;
}

// Filtres optionnels : { id_etudiant, statut }
async function getAllPaiements({ id_etudiant, statut } = {}) {
  const conditions = ['p.etat = true'];
  const params = [];
  if (id_etudiant) {
    conditions.push('i.id_etudiant = ?');
    params.push(id_etudiant);
  }
  if (statut) {
    conditions.push('p.statut = ?');
    params.push(statut);
  }

  const sql = `${SELECT_PAIEMENT_DETAILLE}
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.date_paiement DESC, p.id_paiement DESC`;
  const [rows] = await db.query(sql, params);
  return rows;
}

async function updatePaiement(id_paiement, { id_mode_paiement, montant, reference_virement }) {
  const sql = `
    UPDATE paiement
    SET id_mode_paiement = COALESCE(?, id_mode_paiement),
        montant = COALESCE(?, montant),
        reference_virement = COALESCE(?, reference_virement)
    WHERE id_paiement = ? AND etat = true
  `;
  const [result] = await db.query(sql, [
    id_mode_paiement ?? null, montant ?? null, reference_virement ?? null, id_paiement,
  ]);
  return result.affectedRows > 0;
}

// Paiement en attente sur une échéance (ex. premier paiement déclaré lors d'une inscription en ligne)
async function getPaiementEnAttenteEcheance(id_echeance, connection = db) {
  const [rows] = await connection.query(
    `SELECT id_paiement, montant, reference_virement FROM paiement
     WHERE id_echeance = ? AND etat = true AND statut = ?
     ORDER BY id_paiement LIMIT 1`,
    [id_echeance, STATUTS_PAIEMENT.EN_ATTENTE]
  );
  return rows[0] || null;
}

// Valide un paiement déclaré ; le personnel peut corriger le mode et la référence au passage
async function validerPaiementDeclare(id_paiement, { id_mode_paiement, reference_virement }, connection = db) {
  const [result] = await connection.query(
    `UPDATE paiement
     SET statut = ?, id_mode_paiement = COALESCE(?, id_mode_paiement),
         reference_virement = COALESCE(?, reference_virement)
     WHERE id_paiement = ? AND statut = ? AND etat = true`,
    [STATUTS_PAIEMENT.VALIDE, id_mode_paiement || null, reference_virement || null, id_paiement, STATUTS_PAIEMENT.EN_ATTENTE]
  );
  return result.affectedRows > 0;
}

// Ne change le statut que d'un paiement encore en attente (évite de "re-valider" ou d'annuler un paiement traité).
async function changerStatutPaiementEnAttente(id_paiement, nouveauStatut, connection = db) {
  const [result] = await connection.query(
    `UPDATE paiement SET statut = ? WHERE id_paiement = ? AND statut = ? AND etat = true`,
    [nouveauStatut, id_paiement, STATUTS_PAIEMENT.EN_ATTENTE]
  );
  return result.affectedRows > 0;
}

// Échéance + son propriétaire + ce qui est déjà payé / en attente dessus.
async function getEcheanceAvecSituation(id_echeance) {
  const sql = `
    SELECT e.id_echeance, e.montant_prevu, e.date_echeance, i.id_etudiant,
      COALESCE(SUM(CASE WHEN ${PAIEMENT_VALIDE()} THEN p.montant END), 0) AS montant_valide,
      COUNT(CASE WHEN p.etat = true AND p.statut = '${STATUTS_PAIEMENT.EN_ATTENTE}' THEN 1 END) AS nb_en_attente
    FROM echeance e
    JOIN inscription i ON i.id_inscription = e.id_inscription
    LEFT JOIN paiement p ON p.id_echeance = e.id_echeance
    WHERE e.id_echeance = ? AND e.etat = true AND i.etat = true
    GROUP BY e.id_echeance
  `;
  const [rows] = await db.query(sql, [id_echeance]);
  return rows[0] || null;
}

// ─────────────────────────────────────────────
// Dashboard paiement étudiant
// ─────────────────────────────────────────────

// Prochaine échéance à régler = la plus proche sans paiement validé ni en attente.
async function getProchainPaiementEtudiant(id_etudiant) {
  const sql = `
    SELECT
      e.id_echeance,
      e.montant_prevu,
      e.date_echeance,
      e.id_inscription,
      i.id_formation,
      f.nom AS formation_nom,
      CASE WHEN e.date_echeance < CURDATE() THEN 1 ELSE 0 END AS en_retard
    FROM echeance e
    JOIN inscription i ON i.id_inscription = e.id_inscription
    JOIN formation   f ON f.id_formation  = i.id_formation
    WHERE i.id_etudiant = ?
      AND e.etat = true
      AND i.etat = true
      AND NOT EXISTS (
        SELECT 1 FROM paiement p
        WHERE p.id_echeance = e.id_echeance AND ${PAIEMENT_ACTIF()}
      )
    ORDER BY e.date_echeance ASC
    LIMIT 1
  `;
  const [rows] = await db.query(sql, [id_etudiant]);
  return rows[0] || null;
}

// Dernier paiement validé de l'étudiant
async function getDernierPaiementEtudiant(id_etudiant) {
  const sql = `${SELECT_PAIEMENT_DETAILLE}
    WHERE i.id_etudiant = ? AND ${PAIEMENT_VALIDE()}
    ORDER BY p.date_paiement DESC, p.id_paiement DESC
    LIMIT 1`;
  const [rows] = await db.query(sql, [id_etudiant]);
  return rows[0] || null;
}

// total_du = somme des échéances de l'étudiant ; total_paye = somme de ses paiements validés
async function getTotauxPaiementEtudiant(id_etudiant) {
  const sql = `
    SELECT
      COALESCE((
        SELECT SUM(e.montant_prevu)
        FROM echeance e
        JOIN inscription i ON i.id_inscription = e.id_inscription
        WHERE i.id_etudiant = ? AND e.etat = true AND i.etat = true
      ), 0) AS total_du,
      COALESCE((
        SELECT SUM(p.montant)
        FROM paiement p
        JOIN echeance e ON e.id_echeance = p.id_echeance
        JOIN inscription i ON i.id_inscription = e.id_inscription
        WHERE i.id_etudiant = ? AND ${PAIEMENT_VALIDE()}
      ), 0) AS total_paye
  `;
  const [rows] = await db.query(sql, [id_etudiant, id_etudiant]);
  return rows[0];
}

module.exports = {
  getPaiementEnAttenteEcheance,
  validerPaiementDeclare,
  STATUTS_PAIEMENT,
  PAIEMENT_VALIDE,
  PAIEMENT_ACTIF,
  insererPaiement,
  updatePaiement,
  getPaiementById,
  getAllPaiements,
  changerStatutPaiementEnAttente,
  getEcheanceAvecSituation,
  getProchainPaiementEtudiant,
  getDernierPaiementEtudiant,
  getTotauxPaiementEtudiant,
};
