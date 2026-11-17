// Model du risque de décrochage (voir services/decrochageService.js) : données brutes des
// inscriptions en cours, présences récentes et relances. Rien n'est stocké en plus :
// le risque est recalculé à chaque lecture. Dates renvoyées en 'AAAA-MM-JJ' (pas d'objet Date,
// donc pas de décalage de fuseau).
const db = require('../config/db');
const { CONDITION_STATUT, MONTANT_ENVOYE } = require('./echeanceModel');
const { TYPES_ALERTE } = require('./alerteModel');

const DATE_DEBUT = 'DATE(i.date_inscription)';
const DATE_FIN = `DATE_ADD(${DATE_DEBUT}, INTERVAL f.duree_jours DAY)`;

// Inscription suivie : validée, active, étudiant et formation actifs, formation commencée et pas terminée
const EN_COURS = `i.etat = true AND i.valide = true AND et.etat = true AND f.etat = true
  AND ${DATE_DEBUT} <= CURDATE() AND CURDATE() < ${DATE_FIN}`;

// Échéances en retard : même règle que le statut ROUGE de la page Échéances
const RETARDS = `FROM echeance e WHERE e.id_inscription = i.id_inscription AND e.etat = true AND ${CONDITION_STATUT.ROUGE}`;

const COLONNES = `
  i.id_inscription, i.id_etudiant, i.id_formation, f.nom AS formation_nom,
  u.id_utilisateur, u.prenom, u.nom, u.photo, u.email,
  DATE_FORMAT(${DATE_DEBUT}, '%Y-%m-%d') AS date_debut,
  DATE_FORMAT(${DATE_FIN}, '%Y-%m-%d') AS date_fin,
  DATE_FORMAT((SELECT MAX(p.jour) FROM presence p
                WHERE p.id_utilisateur = u.id_utilisateur AND p.jour <= CURDATE()), '%Y-%m-%d') AS derniere_presence,
  (SELECT COUNT(*) ${RETARDS}) AS nb_retards,
  (SELECT COALESCE(SUM(e.montant_prevu - ${MONTANT_ENVOYE()}), 0) ${RETARDS}) AS montant_retard,
  (SELECT a.date_envoi FROM alerte_envoyee a
    WHERE a.type = '${TYPES_ALERTE.RELANCE_DECROCHAGE}' AND a.id_reference = i.id_inscription) AS derniere_relance`;

const JOINTURES = `
  FROM inscription i
  JOIN formation f ON f.id_formation = i.id_formation
  JOIN etudiant et ON et.id_etudiant = i.id_etudiant
  JOIN utilisateur u ON u.id_utilisateur = et.id_utilisateur`;

// Toutes les inscriptions en cours
async function getInscriptionsEnCours() {
  const [rows] = await db.query(`SELECT ${COLONNES} ${JOINTURES} WHERE ${EN_COURS}`);
  return rows;
}

// Une inscription (pour la relance) ; en_cours = 1 si elle est suivie aujourd'hui
async function getInscription(id_inscription) {
  const [rows] = await db.query(
    `SELECT ${COLONNES}, (${EN_COURS}) AS en_cours ${JOINTURES} WHERE i.id_inscription = ?`,
    [id_inscription]
  );
  return rows[0] || null;
}

// Jours de présence (avant aujourd'hui) des utilisateurs donnés depuis `depuis` ('AAAA-MM-JJ')
async function getPresences(ids_utilisateur, depuis) {
  if (!ids_utilisateur.length) return [];
  const [rows] = await db.query(
    `SELECT id_utilisateur, DATE_FORMAT(jour, '%Y-%m-%d') AS jour FROM presence
     WHERE id_utilisateur IN (?) AND jour >= ? AND jour < CURDATE()`,
    [ids_utilisateur, depuis]
  );
  return rows;
}

// Réserve la relance d'une inscription : false si la dernière date de moins de `delaiJours` jours.
// En une seule requête atomique (deux clics simultanés n'envoient qu'une relance).
// La date de la relance est gardée dans alerte_envoyee (pas de colonne en plus).
async function reserverRelance(id_inscription, delaiJours) {
  const [insertion] = await db.query(
    'INSERT IGNORE INTO alerte_envoyee (type, id_reference) VALUES (?, ?)',
    [TYPES_ALERTE.RELANCE_DECROCHAGE, id_inscription]
  );
  if (insertion.affectedRows > 0) return true;
  const [miseAJour] = await db.query(
    `UPDATE alerte_envoyee SET date_envoi = NOW()
     WHERE type = ? AND id_reference = ? AND date_envoi <= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [TYPES_ALERTE.RELANCE_DECROCHAGE, id_inscription, delaiJours]
  );
  return miseAJour.affectedRows > 0;
}

module.exports = { getInscriptionsEnCours, getInscription, getPresences, reserverRelance };
