// Requêtes de contrôle d'accès aux fichiers uploadés (utilisées par fichierMiddleware).
const db = require('../config/db');

// Le support (chemin "supports/xxx.pdf") est-il publié dans une formation où l'étudiant est inscrit ?
// (un support programmé reste invisible jusqu'à son envoi ; l'inscription doit être validée par l'Accueil)
async function etudiantPeutVoirSupport(chemin, id_etudiant) {
  const [rows] = await db.query(
    `SELECT 1
     FROM support s
     JOIN inscription i ON i.id_formation = s.id_formation
     WHERE s.fichier = ? AND s.etat = true AND s.statut = 'publie' AND i.id_etudiant = ? AND i.etat = true AND i.valide = true
     LIMIT 1`,
    [chemin, id_etudiant]
  );
  return rows.length > 0;
}

// Inscription active de l'étudiant à la formation : { valide } (0 ou 1), ou null s'il n'y est pas inscrit.
// Sert à refuser les supports, commentaires et réactions tant que l'Accueil n'a pas validé l'inscription.
async function inscriptionEtudiantFormation(id_etudiant, id_formation) {
  const [rows] = await db.query(
    `SELECT MAX(i.valide) AS valide
     FROM inscription i
     WHERE i.id_etudiant = ? AND i.id_formation = ? AND i.etat = true
     HAVING COUNT(*) > 0`,
    [id_etudiant, id_formation]
  );
  return rows[0] || null;
}

// Formation d'un support publié et actif, ou null
async function formationDuSupport(id_support) {
  const [rows] = await db.query(
    `SELECT id_formation FROM support WHERE id_support = ? AND etat = true AND statut = 'publie'`,
    [id_support]
  );
  return rows[0]?.id_formation ?? null;
}

// La pièce justificative (chemin "etudiants/xxx.png") est-elle celle de cet étudiant ?
async function estPieceDeLEtudiant(chemin, id_etudiant) {
  const [rows] = await db.query(
    `SELECT 1
     FROM etudiant
     WHERE id_etudiant = ? AND ? IN (photo_1, photo_2, certificat_residence, photocopie_cin)
     LIMIT 1`,
    [id_etudiant, chemin]
  );
  return rows.length > 0;
}

module.exports = {
  etudiantPeutVoirSupport,
  inscriptionEtudiantFormation,
  formationDuSupport,
  estPieceDeLEtudiant,
};
