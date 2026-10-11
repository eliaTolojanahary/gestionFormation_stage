// Model des documents : données nécessaires aux PDF (fiche, facture, attestation),
// enregistrement des factures / attestations générées et documents administratifs.
const db = require('../config/db');
const { PAIEMENT_VALIDE } = require('./paiementModel');

// Étudiant + formation d'une inscription, pour la fiche d'inscription
async function findInscriptionPourFiche(id_inscription) {
  const sql = `
    SELECT i.id_inscription, i.date_inscription, u.nom, u.prenom, u.email, u.telephone,
           f.nom AS formation_nom, f.tarif
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.id_inscription = ?
  `;
  const [rows] = await db.query(sql, [id_inscription]);
  return rows[0];
}

// Paiement + étudiant + formation, et reste à payer sur toute l'inscription
// (total des échéances - total des paiements validés)
async function findPaiementPourFacture(id_paiement) {
  const sql = `
    SELECT p.id_paiement, p.montant, p.date_paiement, p.statut, mp.nom AS mode_paiement,
       u.nom, u.prenom, f.nom AS formation_nom,
       (SELECT IFNULL(SUM(e2.montant_prevu), 0)
        FROM echeance e2
        WHERE e2.id_inscription = i.id_inscription AND e2.etat = true) 
       - 
       (SELECT IFNULL(SUM(p2.montant), 0)
        FROM paiement p2
        JOIN echeance e3 ON p2.id_echeance = e3.id_echeance
        WHERE e3.id_inscription = i.id_inscription AND ${PAIEMENT_VALIDE('p2')}) AS reste_a_payer
FROM paiement p
JOIN echeance e ON p.id_echeance = e.id_echeance
JOIN inscription i ON e.id_inscription = i.id_inscription
JOIN etudiant et ON i.id_etudiant = et.id_etudiant
JOIN utilisateur u ON et.id_utilisateur = u.id_utilisateur
JOIN formation f ON i.id_formation = f.id_formation
LEFT JOIN mode_paiement mp ON p.id_mode_paiement = mp.id_mode_paiement
WHERE p.id_paiement = ? AND p.etat = true
  `;
  const [rows] = await db.query(sql, [id_paiement]);
  return rows[0];
}

async function insertFacture(id_paiement, numeroFacture, cheminRelatif) {
  await db.query(
    `INSERT INTO facture (id_paiement, numero_facture, date_emission, fichier_pdf) VALUES (?, ?, NOW(), ?)`,
    [id_paiement, numeroFacture, cheminRelatif]
  );
}

// Étudiant, formation et note finale à imprimer sur l'attestation
async function findInscriptionPourAttestation(id_inscription) {
  const sql = `
    SELECT i.id_inscription, i.id_formation, u.id_utilisateur, u.email, u.nom, u.prenom,
           f.nom AS formation_nom, f.duree,
           -- note /20 = note système /10 (paiement + présence) + présentation /10 (formateur)
           i.note_presentation, i.note_suggeree + i.note_presentation AS note
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.id_inscription = ? AND i.etat = true
  `;
  const [rows] = await db.query(sql, [id_inscription]);
  return rows[0];
}

async function insertAttestation(id_inscription, uuid, dateDelivrance, cheminRelatif) {
  await db.query(
    `INSERT INTO attestation (id_inscription, uuid_verification, date_delivrance, fichier_pdf) VALUES (?, ?, ?, ?)`,
    [id_inscription, uuid, dateDelivrance, cheminRelatif]
  );
}

// Vérification publique : ne renvoie que la formation et la date (aucune donnée personnelle)
async function findAttestationParUuid(uuid) {
  const sql = `
    SELECT at.date_delivrance, f.nom AS formation_nom
    FROM attestation at
    JOIN inscription i ON at.id_inscription = i.id_inscription
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE at.uuid_verification = ?
  `;
  const [rows] = await db.query(sql, [uuid]);
  return rows;
}

// ─── Documents administratifs ───────────────

async function insertDocument(id_utilisateur, nom_document, fichier) {
  const sql = `
    INSERT INTO document_administratif
    (id_utilisateur, nom_document, fichier)
    VALUES (?, ?, ?)
  `;

  const [result] = await db.query(sql, [
    id_utilisateur,
    nom_document,
    fichier
  ]);

  return result.insertId;
}

// Suppression logique (le fichier reste sur le disque)
async function deleteDocument(id_document) {
  const [result] = await db.query('UPDATE document_administratif SET etat = false WHERE id_document= ?', [id_document]);
  return result.affectedRows > 0;
}

// Documents actifs avec le nom de la personne qui les a déposés, du plus récent au plus ancien
async function getDocuments() {
  const sql = `
    SELECT
      da.id_document,
      da.id_utilisateur,
      da.nom_document,
      da.fichier,
      da.date_creation,
      da.etat,
      u.nom,
      u.prenom
    FROM document_administratif da
    JOIN utilisateur u
      ON da.id_utilisateur = u.id_utilisateur
    WHERE da.etat = TRUE
    ORDER BY da.date_creation DESC
  `;

  const [rows] = await db.query(sql);
  return rows;
}

module.exports = {
  findInscriptionPourFiche, findPaiementPourFacture, insertFacture,
  findInscriptionPourAttestation, insertAttestation, findAttestationParUuid,insertDocument,
getDocuments,deleteDocument
};