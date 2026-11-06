// Model des dépendances : état (actif / désactivé) d'un élément et des éléments dont il dépend
// (paiement -> échéance -> inscription -> étudiant et formation). Utilisé par dependanceService.
const db = require('../config/db');
const { avecTransaction } = require('../utils/transaction');

const COLONNES_INSCRIPTION = `
    i.id_inscription, i.id_etudiant, i.id_formation, i.origine, i.etat AS inscription_active,
    et.etat AS etudiant_actif, u.prenom AS etudiant_prenom, u.nom AS etudiant_nom,
    f.etat AS formation_active, f.nom AS formation_nom`;

const JOINTURES_INSCRIPTION = `
    JOIN etudiant et ON et.id_etudiant = i.id_etudiant
    JOIN utilisateur u ON u.id_utilisateur = et.id_utilisateur
    JOIN formation f ON f.id_formation = i.id_formation`;

async function etatsInscription(id_inscription) {
  const [rows] = await db.query(
    `SELECT ${COLONNES_INSCRIPTION} FROM inscription i ${JOINTURES_INSCRIPTION} WHERE i.id_inscription = ?`,
    [id_inscription]
  );
  return rows[0] || null;
}

async function etatsEcheance(id_echeance) {
  const [rows] = await db.query(
    `SELECT ec.id_echeance, ec.etat AS echeance_active, ${COLONNES_INSCRIPTION}
     FROM echeance ec
     JOIN inscription i ON i.id_inscription = ec.id_inscription ${JOINTURES_INSCRIPTION}
     WHERE ec.id_echeance = ?`,
    [id_echeance]
  );
  return rows[0] || null;
}

async function etatsPaiement(id_paiement) {
  const [rows] = await db.query(
    `SELECT p.id_paiement, p.etat AS paiement_actif, ec.id_echeance, ec.etat AS echeance_active, ${COLONNES_INSCRIPTION}
     FROM paiement p
     JOIN echeance ec ON ec.id_echeance = p.id_echeance
     JOIN inscription i ON i.id_inscription = ec.id_inscription ${JOINTURES_INSCRIPTION}
     WHERE p.id_paiement = ?`,
    [id_paiement]
  );
  return rows[0] || null;
}

// Désactivation / réactivation (etat = false / true) tracée dans historique_etat, tout ou rien ;
// false si l'élément n'existe pas ou est déjà dans l'état demandé (rien n'est tracé).
// `connection` : pour participer à une transaction déjà ouverte.
const TABLES = {
  etudiant: 'id_etudiant',
  formation: 'id_formation',
  inscription: 'id_inscription',
  echeance: 'id_echeance',
  paiement: 'id_paiement',
  document_administratif: 'id_document',
  support: 'id_support',
  utilisateur: 'id_utilisateur',
};

async function changerEtat(table, id, actif, connection = null) {
  if (!connection) return avecTransaction((c) => changerEtat(table, id, actif, c));

  const cle = TABLES[table];
  const [result] = await connection.query(
    `UPDATE ${table} SET etat = ? WHERE ${cle} = ? AND etat = ?`,
    [actif, id, !actif]
  );
  if (result.affectedRows === 0) return false;
  await connection.query(
    `INSERT INTO historique_etat (table_origine, id_origine, actif) SELECT ?, ${cle}, ? FROM ${table} WHERE ${cle} = ?`,
    [table, actif, id]
  );
  return true;
}

async function existe(table, id) {
  const [rows] = await db.query(`SELECT 1 FROM ${table} WHERE ${TABLES[table]} = ?`, [id]);
  return rows.length > 0;
}

// Support (publié ou brouillon) avec l'état de sa formation, pour le réactiver
async function etatsSupport(id_support) {
  const [rows] = await db.query(
    `SELECT s.id_support, s.id_utilisateur, s.etat AS support_actif,
            f.etat AS formation_active, f.nom AS formation_nom
     FROM support s JOIN formation f ON f.id_formation = s.id_formation
     WHERE s.id_support = ?`,
    [id_support]
  );
  return rows[0] || null;
}

module.exports = { etatsInscription, etatsEcheance, etatsPaiement, etatsSupport, changerEtat, existe };
