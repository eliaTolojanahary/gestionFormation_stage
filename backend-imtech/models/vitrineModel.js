// Model de la vitrine publique (aucune donnée personnelle des étudiants).
const db = require('../config/db');
const { clauseLimite } = require('../utils/pagination');

// Formations actives ; id_etudiant : sans celles où cet étudiant a déjà une inscription active
// (« Voir plus de formations » d'un étudiant connecté)
function filtreFormations({ id_etudiant } = {}) {
  if (!id_etudiant) return { where: 'f.etat = true', params: [] };
  return {
    where: `f.etat = true AND NOT EXISTS (SELECT 1 FROM inscription d
              WHERE d.id_formation = f.id_formation AND d.id_etudiant = ? AND d.etat = true)`,
    params: [id_etudiant],
  };
}

// Formations avec leur formateur et le nombre d'inscrits, les plus demandées d'abord.
// pagination { limite, offset } ou null (toutes)
async function getFormationsPubliques(filtres = {}, pagination = null) {
  const { where, params } = filtreFormations(filtres);
  const limite = clauseLimite(pagination);
  const [rows] = await db.query(
    `SELECT f.id_formation, f.nom, f.description, f.engagement_formateur, f.image, f.tarif, f.duree, f.duree_jours,
            u.id_utilisateur AS id_formateur, u.nom AS nom_formateur, u.prenom AS prenom_formateur,
            (SELECT COUNT(*) FROM inscription i WHERE i.id_formation = f.id_formation AND i.etat = true) AS nb_inscrits
     FROM formation f
     JOIN utilisateur u ON u.id_utilisateur = f.id_utilisateur
     WHERE ${where}
     ORDER BY nb_inscrits DESC, f.nom, f.id_formation${limite.sql}`,
    [...params, ...limite.params]
  );
  return rows;
}

async function compterFormationsPubliques(filtres = {}) {
  const { where, params } = filtreFormations(filtres);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM formation f WHERE ${where}`, params);
  return Number(total);
}

// Noms des formations actives animées par ces formateurs : [{ id_formateur, nom }]
async function getFormationsDesFormateurs(ids_formateurs) {
  if (ids_formateurs.length === 0) return [];
  const [rows] = await db.query(
    `SELECT id_utilisateur AS id_formateur, nom FROM formation
     WHERE etat = true AND id_utilisateur IN (?) ORDER BY nom`,
    [ids_formateurs]
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

module.exports = {
  getFormationsPubliques, compterFormationsPubliques, getFormationsDesFormateurs, modePaiementExiste, getModesPaiement,
};
