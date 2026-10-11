// Model des demandes d'assistance des étudiants.
const db = require('../config/db');

// Noms des statuts tels qu'insérés dans la table `statut` (migration 003)
const STATUTS_ASSISTANCE = Object.freeze({
  EN_ATTENTE: 'En attente',
  RESOLU: 'Résolu',
});

// Colonnes communes : demande + statut + étudiant + personne qui l'a résolue (LEFT JOIN : vide si non résolue)
const SELECT_ASSISTANCE = `
  SELECT a.id_assistance, a.objet, a.contenu, a.date_envoi, a.date_resolution,
         s.nom AS statut,
         a.id_etudiant, ue.id_utilisateur AS id_utilisateur_etudiant,
         ue.nom AS etudiant_nom, ue.prenom AS etudiant_prenom, ue.email AS etudiant_email,
         a.id_utilisateur AS id_resolu_par, ur.prenom AS resolu_par_prenom, ur.nom AS resolu_par_nom
  FROM assistance a
  JOIN statut s ON s.id_statut = a.id_statut
  JOIN etudiant e ON e.id_etudiant = a.id_etudiant
  JOIN utilisateur ue ON ue.id_utilisateur = e.id_utilisateur
  LEFT JOIN utilisateur ur ON ur.id_utilisateur = a.id_utilisateur
`;

// Nouvelle demande, toujours créée avec le statut "En attente"
async function insertAssistance({ id_etudiant, objet, contenu }) {
  const [result] = await db.query(
    `INSERT INTO assistance (id_etudiant, id_statut, objet, contenu, date_envoi, etat)
     VALUES (?, (SELECT id_statut FROM statut WHERE nom = ?), ?, ?, NOW(), true)`,
    [id_etudiant, STATUTS_ASSISTANCE.EN_ATTENTE, objet, contenu]
  );
  return result.insertId;
}

// Filtres optionnels : { id_etudiant, statut }
async function getAssistances({ id_etudiant, statut } = {}) {
  const conditions = ['a.etat = true'];
  const params = [];
  if (id_etudiant) {
    conditions.push('a.id_etudiant = ?');
    params.push(id_etudiant);
  }
  if (statut) {
    conditions.push('s.nom = ?');
    params.push(statut);
  }
  const [rows] = await db.query(
    `${SELECT_ASSISTANCE} WHERE ${conditions.join(' AND ')} ORDER BY a.date_envoi DESC`,
    params
  );
  return rows;
}

async function getAssistanceById(id_assistance) {
  const [rows] = await db.query(`${SELECT_ASSISTANCE} WHERE a.id_assistance = ? AND a.etat = true`, [id_assistance]);
  return rows[0] || null;
}

// Ne résout qu'une demande encore en attente ; renvoie false sinon
async function resoudreAssistance(id_assistance, id_utilisateur) {
  const [result] = await db.query(
    `UPDATE assistance
     SET id_statut = (SELECT id_statut FROM statut WHERE nom = ?),
         id_utilisateur = ?,
         date_resolution = NOW()
     WHERE id_assistance = ? AND etat = true
       AND id_statut = (SELECT id_statut FROM statut WHERE nom = ?)`,
    [STATUTS_ASSISTANCE.RESOLU, id_utilisateur, id_assistance, STATUTS_ASSISTANCE.EN_ATTENTE]
  );
  return result.affectedRows > 0;
}

module.exports = {
  STATUTS_ASSISTANCE,
  insertAssistance,
  getAssistances,
  getAssistanceById,
  resoudreAssistance,
};
