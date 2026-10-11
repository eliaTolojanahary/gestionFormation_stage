// Model de la vitrine publique (aucune donnée personnelle des étudiants).
const db = require('../config/db');

// Formations actives avec leur formateur et le nombre d'inscrits
async function getFormationsPubliques() {
  const [rows] = await db.query(
    `SELECT f.id_formation, f.nom, f.description, f.engagement_formateur, f.image, f.tarif, f.duree, f.duree_jours,
            u.id_utilisateur AS id_formateur, u.nom AS nom_formateur, u.prenom AS prenom_formateur,
            (SELECT COUNT(*) FROM inscription i WHERE i.id_formation = f.id_formation AND i.etat = true) AS nb_inscrits
     FROM formation f
     JOIN utilisateur u ON u.id_utilisateur = f.id_utilisateur
     WHERE f.etat = true
     ORDER BY nb_inscrits DESC, f.nom`
  );
  return rows;
}

async function modePaiementExiste(id_mode_paiement, connection = db) {
  const [rows] = await connection.query('SELECT 1 FROM mode_paiement WHERE id_mode_paiement = ?', [id_mode_paiement]);
  return rows.length > 0;
}

async function getModesPaiement() {
  const [rows] = await db.query('SELECT id_mode_paiement, nom FROM mode_paiement ORDER BY id_mode_paiement');
  return rows;
}

module.exports = { getFormationsPubliques, modePaiementExiste, getModesPaiement };
