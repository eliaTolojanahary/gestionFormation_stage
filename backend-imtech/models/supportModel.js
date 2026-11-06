// Model des supports de cours : `contenu` = texte mis en forme (HTML nettoyé, voir utils/contenuRiche.js)
// et / ou `fichier` = pièce jointe, chemin "supports/xxx.pdf" (PDF, image, audio ou vidéo).
// statut 'publie' : visible par les étudiants ; 'programme' : brouillon, publié automatiquement
// à date_envoi_prevue (voir services/supportProgrammeService.js).
const db = require('../config/db');
const { conditionEtat } = require('../utils/etat');
const { clauseCurseur, clauseLimite } = require('../utils/pagination');
const { motifPleinTexte, conditionFormation } = require('../utils/recherche');

const STATUTS_SUPPORT = Object.freeze({ PROGRAMME: 'programme', PUBLIE: 'publie' });

// Colonnes d'un support publié affiché dans une liste, avec sa formation et son auteur
const COLONNES_LISTE = `
  s.id_support, s.id_formation, s.titre, s.contenu, s.fichier, s.date_publication, s.etat,
  f.nom AS nom_formation, f.id_utilisateur AS id_formateur,
  u.nom AS prof_nom, u.prenom AS prof_prenom, u.photo AS prof_photo, s.id_utilisateur
`;

// Supports publiés d'une formation, du plus récent au plus ancien, avec le formateur
// etat : 'actif' (défaut), 'inactif' ou 'tous' (page Documents du web)
// curseur { limite, avant } : une page (limite + 1 lignes, voir utils/pagination.js) ; null : tout
async function getSupportsByFormation(id_formation, etat = 'actif', curseur = null) {
  const conditionSupport = conditionEtat('s.etat', etat);
  const page = clauseCurseur(curseur, { table: 'support', alias: 's', date: 'date_publication', id: 'id_support' });
  const sql = `
    SELECT ${COLONNES_LISTE}
    FROM support s
    JOIN utilisateur u ON s.id_utilisateur = u.id_utilisateur
    JOIN formation f ON f.id_formation=s.id_formation
    WHERE s.id_formation = ?${conditionSupport ? ` AND ${conditionSupport}` : ''} AND s.statut = '${STATUTS_SUPPORT.PUBLIE}'${page.where}
    ORDER BY s.date_publication DESC, s.id_support DESC${page.limite}
  `;
  const [rows] = await db.query(sql, [id_formation, ...page.whereParams, ...page.limiteParams]);
  return rows;
}

async function compterSupportsByFormation(id_formation, etat = 'actif') {
  const conditionSupport = conditionEtat('s.etat', etat);
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM support s
     WHERE s.id_formation = ?${conditionSupport ? ` AND ${conditionSupport}` : ''} AND s.statut = '${STATUTS_SUPPORT.PUBLIE}'`,
    [id_formation]
  );
  return Number(rows[0].total);
}

// Extensions de chaque type de pièce jointe (mêmes règles que typeFichier côté web)
const EXTENSIONS_TYPE = Object.freeze({
  pdf: ['pdf'],
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
  audio: ['mp3', 'm4a', 'aac', 'ogg', 'wav', 'oga'],
  video: ['mp4', 'webm', 'mov'],
});

const TRIS_SUPPORT = Object.freeze({
  recents: 's.date_publication DESC, s.id_support DESC',
  anciens: 's.date_publication ASC, s.id_support ASC',
  titre: 's.titre ASC, s.id_support ASC',
});

// Supports publiés et actifs, avec recherche et filtres :
//   id_etudiant  : seulement les formations où son inscription est active et validée
//   id_formateur : seulement les formations qu'il anime
//   id_formation, recherche (titre, formation, texte), type ('texte' = sans fichier, ou EXTENSIONS_TYPE)
function filtresSupports({ id_etudiant, id_formateur, id_formation, recherche, type } = {}) {
  const conditions = ['s.etat = true', `s.statut = '${STATUTS_SUPPORT.PUBLIE}'`];
  const params = [];
  if (id_etudiant) {
    conditions.push(`EXISTS (SELECT 1 FROM inscription i WHERE i.id_formation = s.id_formation
      AND i.id_etudiant = ? AND i.etat = true AND i.valide = true)`);
    params.push(id_etudiant);
  }
  if (id_formateur) { conditions.push('f.id_utilisateur = ?'); params.push(id_formateur); }
  if (id_formation) { conditions.push('s.id_formation = ?'); params.push(id_formation); }
  if (recherche) {
    // Titre et texte : index plein texte ft_support ; nom de la formation : LIKE (petite table)
    const motif = motifPleinTexte(recherche);
    const formation = conditionFormation('s.id_formation', recherche);
    conditions.push(`(${motif ? `s.id_support IN (SELECT rs.id_support FROM support rs
                       WHERE MATCH(rs.titre, rs.contenu) AGAINST (? IN BOOLEAN MODE)) OR ` : ''}${formation.sql})`);
    params.push(...(motif ? [motif] : []), ...formation.params);
  }
  if (type === 'texte') conditions.push('s.fichier IS NULL');
  else if (EXTENSIONS_TYPE[type]) {
    conditions.push("LOWER(SUBSTRING_INDEX(s.fichier, '.', -1)) IN (?)");
    params.push(EXTENSIONS_TYPE[type]);
  }
  return { where: conditions.join(' AND '), params };
}

// pagination { limite, offset } ou null (toute la liste) ; filtres.tri : clé de TRIS_SUPPORT
async function getSupports(filtres = {}, pagination = null) {
  const { where, params } = filtresSupports(filtres);
  const limite = clauseLimite(pagination);
  const [rows] = await db.query(
    `SELECT ${COLONNES_LISTE}
     FROM support s
     JOIN utilisateur u ON s.id_utilisateur = u.id_utilisateur
     JOIN formation f ON f.id_formation = s.id_formation
     WHERE ${where}
     ORDER BY ${TRIS_SUPPORT[filtres.tri] || TRIS_SUPPORT.recents}${limite.sql}`,
    [...params, ...limite.params]
  );
  return rows;
}

async function compterSupports(filtres = {}) {
  const { where, params } = filtresSupports(filtres);
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM support s JOIN formation f ON f.id_formation = s.id_formation WHERE ${where}`,
    params
  );
  return Number(rows[0].total);
}

// Support publié (un brouillon n'est ni consultable, ni commentable)
async function getSupportById(id_support) {
  const sql = `
    SELECT s.id_support, s.titre, s.contenu, s.fichier, s.date_publication, s.id_utilisateur,
           f.id_formation, f.nom AS nom_formation, f.id_utilisateur AS id_formateur,
           u.nom AS prof_nom, u.prenom AS prof_prenom, u.photo AS prof_photo
    FROM support s
    JOIN utilisateur u ON s.id_utilisateur = u.id_utilisateur
    JOIN formation f ON f.id_formation = s.id_formation
    WHERE s.id_support = ? AND s.etat = true AND s.statut = '${STATUTS_SUPPORT.PUBLIE}'
  `;
  const [rows] = await db.query(sql, [id_support]);
  return rows[0] || null;
}

// Champs communs aux supports programmés (liste du formateur, planificateur)
const COLONNES_PROGRAMME = `
  s.id_support, s.titre, s.contenu, s.fichier, s.statut, s.date_envoi_prevue, s.annonce_envoyee, s.id_utilisateur,
  f.id_formation, f.nom AS nom_formation, u.nom AS prof_nom, u.prenom AS prof_prenom
`;

// Supports programmés, pas encore envoyés ; id_utilisateur null = tous (Super Admin)
async function getSupportsProgrammes(id_utilisateur = null) {
  const [rows] = await db.query(
    `SELECT ${COLONNES_PROGRAMME}
     FROM support s
     JOIN formation f ON f.id_formation = s.id_formation
     JOIN utilisateur u ON u.id_utilisateur = s.id_utilisateur
     WHERE s.etat = true AND s.statut = '${STATUTS_SUPPORT.PROGRAMME}'
       AND (? IS NULL OR s.id_utilisateur = ?)
     ORDER BY s.date_envoi_prevue`,
    [id_utilisateur, id_utilisateur]
  );
  return rows;
}

async function getSupportProgramme(id_support) {
  const [rows] = await db.query(
    `SELECT ${COLONNES_PROGRAMME}
     FROM support s
     JOIN formation f ON f.id_formation = s.id_formation
     JOIN utilisateur u ON u.id_utilisateur = s.id_utilisateur
     WHERE s.id_support = ? AND s.etat = true AND s.statut = '${STATUTS_SUPPORT.PROGRAMME}'`,
    [id_support]
  );
  return rows[0] || null;
}

// Programmés dont l'annonce (1 h avant) doit partir : envoi prévu avant `limite`
async function getSupportsAAnnoncer(limite) {
  const [rows] = await db.query(
    `SELECT ${COLONNES_PROGRAMME}
     FROM support s
     JOIN formation f ON f.id_formation = s.id_formation
     JOIN utilisateur u ON u.id_utilisateur = s.id_utilisateur
     WHERE s.etat = true AND s.statut = '${STATUTS_SUPPORT.PROGRAMME}'
       AND s.annonce_envoyee = false AND s.date_envoi_prevue <= ?`,
    [limite]
  );
  return rows;
}

// Programmés dont l'heure d'envoi est passée
async function getSupportsAPublier(maintenant) {
  const [rows] = await db.query(
    `SELECT ${COLONNES_PROGRAMME}
     FROM support s
     JOIN formation f ON f.id_formation = s.id_formation
     JOIN utilisateur u ON u.id_utilisateur = s.id_utilisateur
     WHERE s.etat = true AND s.statut = '${STATUTS_SUPPORT.PROGRAMME}' AND s.date_envoi_prevue <= ?`,
    [maintenant]
  );
  return rows;
}

// date_envoi_prevue null : publié tout de suite ; sinon programmé (brouillon)
async function createSupport({ id_formation, id_utilisateur, titre, contenu = null, fichier = null, date_envoi_prevue = null }) {
  const statut = date_envoi_prevue ? STATUTS_SUPPORT.PROGRAMME : STATUTS_SUPPORT.PUBLIE;
  const sql = `
    INSERT INTO support (id_formation, id_utilisateur, titre, contenu, fichier, statut, date_envoi_prevue, date_publication, etat)
    VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), true)
  `;
  const [result] = await db.query(sql, [
    id_formation, id_utilisateur, titre, contenu, fichier, statut, date_envoi_prevue, date_envoi_prevue,
  ]);
  return result.insertId;
}

// Modifie un brouillon. Si l'heure change, l'annonce repart (avec la nouvelle heure).
// contenu : undefined = inchangé, null = texte supprimé, sinon nouveau texte
async function updateSupportProgramme(id_support, { titre, contenu, fichier, date_envoi_prevue }) {
  const [result] = await db.query(
    `UPDATE support
     SET titre = COALESCE(?, titre),
         contenu = IF(?, ?, contenu),
         fichier = COALESCE(?, fichier),
         annonce_envoyee = IF(? IS NULL OR ? = date_envoi_prevue, annonce_envoyee, false),
         date_envoi_prevue = COALESCE(?, date_envoi_prevue),
         date_publication = COALESCE(?, date_publication)
     WHERE id_support = ? AND etat = true AND statut = '${STATUTS_SUPPORT.PROGRAMME}'`,
    [
      titre, contenu !== undefined, contenu ?? null, fichier,
      date_envoi_prevue, date_envoi_prevue, date_envoi_prevue, date_envoi_prevue, id_support,
    ]
  );
  return result.affectedRows > 0;
}

// Réserve l'annonce : renvoie false si elle est déjà partie (évite les doublons)
async function marquerAnnonceEnvoyee(id_support) {
  const [result] = await db.query(
    'UPDATE support SET annonce_envoyee = true WHERE id_support = ? AND annonce_envoyee = false',
    [id_support]
  );
  return result.affectedRows > 0;
}

// Publie un brouillon ; renvoie false s'il est déjà publié ou supprimé (évite les doublons)
async function publierSupport(id_support) {
  const [result] = await db.query(
    `UPDATE support SET statut = '${STATUTS_SUPPORT.PUBLIE}', date_publication = NOW()
     WHERE id_support = ? AND etat = true AND statut = '${STATUTS_SUPPORT.PROGRAMME}'`,
    [id_support]
  );
  return result.affectedRows > 0;
}

// Comptes des étudiants inscrits à la formation (destinataires des notifications)
async function getIdsUtilisateursInscrits(id_formation) {
  const [rows] = await db.query(
    `SELECT DISTINCT e.id_utilisateur
     FROM inscription i
     JOIN etudiant e ON e.id_etudiant = i.id_etudiant
     WHERE i.id_formation = ? AND i.etat = true AND e.id_utilisateur IS NOT NULL`,
    [id_formation]
  );
  return rows.map((r) => r.id_utilisateur);
}

// Support (publié ou brouillon) pour vérifier les droits avant suppression
async function getSupportPourSuppression(id_support) {
  const [rows] = await db.query(
    'SELECT id_support, id_utilisateur FROM support WHERE id_support = ? AND etat = true',
    [id_support]
  );
  return rows[0] || null;
}

module.exports = {
  STATUTS_SUPPORT,
  TRIS_SUPPORT,
  EXTENSIONS_TYPE,
  getSupportsByFormation,
  compterSupportsByFormation,
  getSupports,
  compterSupports,
  getSupportById,
  getSupportsProgrammes,
  getSupportProgramme,
  getSupportsAAnnoncer,
  getSupportsAPublier,
  createSupport,
  updateSupportProgramme,
  marquerAnnonceEnvoyee,
  publierSupport,
  getIdsUtilisateursInscrits,
  getSupportPourSuppression,
};
