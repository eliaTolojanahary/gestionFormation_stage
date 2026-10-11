// Model des supports de cours : `contenu` = texte mis en forme (HTML nettoyé, voir utils/contenuRiche.js)
// et / ou `fichier` = pièce jointe, chemin "supports/xxx.pdf" (PDF, image, audio ou vidéo).
// statut 'publie' : visible par les étudiants ; 'programme' : brouillon, publié automatiquement
// à date_envoi_prevue (voir services/supportProgrammeService.js).
const db = require('../config/db');

const STATUTS_SUPPORT = Object.freeze({ PROGRAMME: 'programme', PUBLIE: 'publie' });

// Supports publiés d'une formation, du plus récent au plus ancien, avec le formateur
async function getSupportsByFormation(id_formation) {
  const sql = `
    SELECT s.id_support, s.id_formation, s.titre, s.contenu, s.fichier, s.date_publication, f.nom AS nom_formation, u.nom AS prof_nom, u.prenom AS prof_prenom, u.photo as prof_photo, s.id_utilisateur
    FROM support s
    JOIN utilisateur u ON s.id_utilisateur = u.id_utilisateur
    JOIN formation f ON f.id_formation=s.id_formation
    WHERE s.id_formation = ? AND s.etat = true AND s.statut = '${STATUTS_SUPPORT.PUBLIE}'
    ORDER BY s.date_publication DESC
  `;
  const [rows] = await db.query(sql, [id_formation]);
  return rows;
}

// Support publié (un brouillon n'est ni consultable, ni commentable)
async function getSupportById(id_support) {
  const sql = `
    SELECT s.id_support, s.titre, s.contenu, s.fichier, s.date_publication, s.id_utilisateur,
           f.id_formation, f.nom AS nom_formation,
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

// Suppression logique (etat = false) ; fonctionne aussi sur un brouillon
async function deleteSupport(id_support) {
  const [result] = await db.query('UPDATE support SET etat = false WHERE id_support = ?', [id_support]);
  return result.affectedRows > 0;
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
  getSupportsByFormation,
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
  deleteSupport,
  getSupportPourSuppression,
};
