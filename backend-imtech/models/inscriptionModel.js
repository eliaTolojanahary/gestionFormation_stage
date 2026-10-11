// Model des inscriptions. `etat` = inscription non supprimée, `valide` = inscription validée
// par le personnel (premier paiement reçu).
const db = require('../config/db');

// Les fonctions qui acceptent `connection` peuvent participer à une transaction (voir utils/transaction.js).

// Empêche d'inscrire deux fois le même étudiant à la même formation
async function inscriptionActiveExiste(id_etudiant, id_formation, connection = db) {
  const [rows] = await connection.query(
    'SELECT id_inscription FROM inscription WHERE id_etudiant = ? AND id_formation = ? AND etat = true',
    [id_etudiant, id_formation]
  );
  return rows.length > 0;
}

async function getIdUtilisateurByEtudiant(id_etudiant, connection = db) {
  const [rows] = await connection.query(
    'SELECT id_utilisateur FROM etudiant WHERE id_etudiant = ? AND etat = true',
    [id_etudiant]
  );
  return rows[0]?.id_utilisateur || null;
}

// Nouvelle inscription : active mais pas encore validée.
// origine 'en_ligne' = faite par l'étudiant depuis la vitrine de l'application mobile
async function insertInscription(id_etudiant, id_utilisateur, id_formation, connection = db, origine = 'accueil') {
  const sql = `
    INSERT INTO inscription (id_etudiant, id_utilisateur, id_formation, date_inscription, etat, valide, origine)
    VALUES (?, ?, ?, NOW(), true, false, ?)
  `;
  const [result] = await connection.query(sql, [id_etudiant, id_utilisateur, id_formation, origine]);
  return result.insertId;
}

// Ne valide qu'une inscription pas encore validée : renvoie false si elle l'était déjà.
async function setInscriptionValidee(id_inscription, connection = db) {
  const [result] = await connection.query(
    'UPDATE inscription SET valide = true WHERE id_inscription = ? AND valide = false AND etat = true',
    [id_inscription]
  );
  return result.affectedRows > 0;
}

// Tarif et durée de la formation, nécessaires au calcul de l'échéancier
async function findFormationActive(id_formation, connection = db) {
  const [rows] = await connection.query(
    'SELECT id_formation, tarif, duree_jours FROM formation WHERE id_formation = ? AND etat = true',
    [id_formation]
  );
  return rows[0] || null;
}

async function findInscriptionAvecTarif(id_inscription, connection = db) {
  const sql = `
    SELECT i.id_inscription, i.id_etudiant, i.id_formation, i.etat, i.valide,
           f.tarif, f.duree_jours
    FROM inscription i
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.id_inscription = ? AND i.etat = true
  `;
  const [rows] = await connection.query(sql, [id_inscription]);
  return rows[0];
}

// Inscriptions actives avec l'étudiant et la formation
async function getAllInscriptions() {
  const sql = `
    SELECT i.id_inscription, i.date_inscription, i.etat, i.valide, i.origine,
           e.id_etudiant, u.id_utilisateur AS id_utilisateur_etudiant, u.email AS email_etudiant,
           u.nom AS nom_etudiant, u.prenom AS prenom_etudiant,
           f.id_formation, f.nom AS nom_formation,
           -- Premier paiement déclaré par l'étudiant (inscription en ligne), en attente de validation
           (SELECT p.reference_virement FROM echeance ec
              JOIN paiement p ON p.id_echeance = ec.id_echeance AND p.etat = true AND p.statut = 'en_attente'
             WHERE ec.id_inscription = i.id_inscription AND ec.etat = true
             ORDER BY ec.date_echeance, p.id_paiement LIMIT 1) AS reference_declaree,
           (SELECT p.montant FROM echeance ec
              JOIN paiement p ON p.id_echeance = ec.id_echeance AND p.etat = true AND p.statut = 'en_attente'
             WHERE ec.id_inscription = i.id_inscription AND ec.etat = true
             ORDER BY ec.date_echeance, p.id_paiement LIMIT 1) AS montant_declare
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.etat = true
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function getInscriptionById(id_inscription) {
  const sql = `
    SELECT i.*, u.nom AS nom_etudiant, u.prenom AS prenom_etudiant, f.nom AS nom_formation
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.id_inscription = ? AND i.etat = true
  `;
  const [rows] = await db.query(sql, [id_inscription]);
  return rows[0];
}

// Suppression logique (etat = false)
async function deleteInscription(id_inscription) {
  const [result] = await db.query('UPDATE inscription SET etat = false WHERE id_inscription = ?', [id_inscription]);
  return result.affectedRows > 0;
}

module.exports = {
  inscriptionActiveExiste, getIdUtilisateurByEtudiant, findFormationActive,
  insertInscription, setInscriptionValidee, findInscriptionAvecTarif,
  getAllInscriptions, getInscriptionById, deleteInscription
};