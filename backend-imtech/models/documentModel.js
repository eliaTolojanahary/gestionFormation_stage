const db = require('../config/db');

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

async function findPaiementPourFacture(id_paiement) {
  const sql = `
    SELECT p.id_paiement, p.montant, p.date_paiement, mp.nom AS mode_paiement,
           u.nom, u.prenom, f.nom AS formation_nom
    FROM paiement p
    JOIN echeance e ON p.id_echeance = e.id_echeance
    JOIN inscription i ON e.id_inscription = i.id_inscription
    JOIN etudiant et ON i.id_etudiant = et.id_etudiant
    JOIN utilisateur u ON et.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    LEFT JOIN mode_paiement mp ON p.id_mode_paiement = mp.id_mode_paiement
    WHERE p.id_paiement = ?
  `;
  const [rows] = await db.query(sql, [id_paiement]);
  return rows[0];
}

async function insertFacture(id_paiement, numeroFacture, cheminRelatif) {
  await db.query(
    `INSERT INTO facture (id_paiement, numero_facture, date_emission, fichier_pdf) VALUES (?, ?, CURDATE(), ?)`,
    [id_paiement, numeroFacture, cheminRelatif]
  );
}

async function findInscriptionPourAttestation(id_inscription) {
  const sql = `
    SELECT i.id_inscription, u.nom, u.prenom, f.nom AS formation_nom, f.duree
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.id_inscription = ?
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

module.exports = {
  findInscriptionPourFiche, findPaiementPourFacture, insertFacture,
  findInscriptionPourAttestation, insertAttestation, findAttestationParUuid
};