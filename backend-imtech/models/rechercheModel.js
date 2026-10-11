// Model de la recherche globale (barre de recherche du tableau de bord web).
// Chaque fonction renvoie au plus `limite` résultats ; `motif` est déjà de la forme "%texte%".
const db = require('../config/db');

// Étudiants actifs (nom, prénom, nom complet, e-mail, téléphone).
// idFormateur : seulement les étudiants inscrits à une de ses formations (avec la formation)
async function chercherEtudiants(motif, limite, idFormateur = null) {
  const [rows] = await db.query(
    `SELECT DISTINCT e.id_etudiant, u.nom, u.prenom, u.email, u.photo,
            ${idFormateur ? 'f.id_formation, f.nom AS nom_formation' : 'NULL AS id_formation, NULL AS nom_formation'}
     FROM etudiant e
     JOIN utilisateur u ON u.id_utilisateur = e.id_utilisateur
     ${idFormateur ? `JOIN inscription i ON i.id_etudiant = e.id_etudiant AND i.etat = true
     JOIN formation f ON f.id_formation = i.id_formation AND f.etat = true AND f.id_utilisateur = ?` : ''}
     WHERE e.etat = true
       AND (u.nom LIKE ? OR u.prenom LIKE ? OR CONCAT(u.prenom, ' ', u.nom) LIKE ?
            OR CONCAT(u.nom, ' ', u.prenom) LIKE ? OR u.email LIKE ? OR u.telephone LIKE ?)
     ORDER BY u.nom, u.prenom
     LIMIT ?`,
    [...(idFormateur ? [idFormateur] : []), motif, motif, motif, motif, motif, motif, limite]
  );
  return rows;
}

// Formations actives (nom, description) ; idFormateur : seulement les siennes
async function chercherFormations(motif, limite, idFormateur = null) {
  const [rows] = await db.query(
    `SELECT f.id_formation, f.nom, f.duree, f.tarif
     FROM formation f
     WHERE f.etat = true AND (f.nom LIKE ? OR f.description LIKE ?)
       AND (? IS NULL OR f.id_utilisateur = ?)
     ORDER BY f.nom
     LIMIT ?`,
    [motif, motif, idFormateur, idFormateur, limite]
  );
  return rows;
}

// Inscriptions actives, retrouvées par l'étudiant ou la formation
async function chercherInscriptions(motif, limite) {
  const [rows] = await db.query(
    `SELECT i.id_inscription, i.date_inscription, u.nom, u.prenom, f.nom AS nom_formation
     FROM inscription i
     JOIN etudiant e ON e.id_etudiant = i.id_etudiant
     JOIN utilisateur u ON u.id_utilisateur = e.id_utilisateur
     JOIN formation f ON f.id_formation = i.id_formation
     WHERE i.etat = true
       AND (u.nom LIKE ? OR u.prenom LIKE ? OR CONCAT(u.prenom, ' ', u.nom) LIKE ?
            OR CONCAT(u.nom, ' ', u.prenom) LIKE ? OR f.nom LIKE ?)
     ORDER BY i.date_inscription DESC
     LIMIT ?`,
    [motif, motif, motif, motif, motif, limite]
  );
  return rows;
}

// Comptes du personnel et des étudiants (Super Admin)
async function chercherUtilisateurs(motif, limite) {
  const [rows] = await db.query(
    `SELECT u.id_utilisateur, u.nom, u.prenom, u.email, u.photo, r.nom AS role
     FROM utilisateur u
     JOIN role r ON r.id_role = u.id_role
     WHERE u.etat = true
       AND (u.nom LIKE ? OR u.prenom LIKE ? OR CONCAT(u.prenom, ' ', u.nom) LIKE ?
            OR CONCAT(u.nom, ' ', u.prenom) LIKE ? OR u.email LIKE ?)
     ORDER BY u.nom, u.prenom
     LIMIT ?`,
    [motif, motif, motif, motif, motif, limite]
  );
  return rows;
}

// Supports du formateur (publiés et programmés), par titre ou texte
async function chercherSupports(motif, limite, idFormateur) {
  const [rows] = await db.query(
    `SELECT s.id_support, s.titre, s.statut, s.date_publication, s.date_envoi_prevue, f.nom AS nom_formation
     FROM support s
     JOIN formation f ON f.id_formation = s.id_formation
     WHERE s.etat = true AND s.id_utilisateur = ? AND (s.titre LIKE ? OR s.contenu LIKE ?)
     ORDER BY COALESCE(s.date_envoi_prevue, s.date_publication) DESC
     LIMIT ?`,
    [idFormateur, motif, motif, limite]
  );
  return rows;
}

module.exports = { chercherEtudiants, chercherFormations, chercherInscriptions, chercherUtilisateurs, chercherSupports };
