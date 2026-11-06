// Model des inscriptions. `etat` = inscription non supprimée, `valide` = inscription validée
// par le personnel (premier paiement reçu).
const db = require('../config/db');
const { clauseLimite } = require('../utils/pagination');
const { conditionEtudiantOuFormation } = require('../utils/recherche');
const { conditionEtat } = require('../utils/etat');
const { PIECES_FOURNIES, PIECES_DOSSIER, CHAMPS_DOSSIER } = require('../config/dossier');

// Statut calculé (pas de colonne) : une inscription est « reussi » dès que son id est présent
// dans attestation, sinon « en_cours ». Elle reste active : ses montants comptent toujours.
const ATTESTATION_DELIVREE = (alias = 'i') =>
  `EXISTS (SELECT 1 FROM attestation a WHERE a.id_inscription = ${alias}.id_inscription)`;
const STATUT_INSCRIPTION = (alias = 'i') =>
  `CASE WHEN ${ATTESTATION_DELIVREE(alias)} THEN 'reussi' ELSE 'en_cours' END`;

// Les fonctions qui acceptent `connection` peuvent participer à une transaction (voir utils/transaction.js).

// Empêche d'inscrire deux fois le même étudiant à la même formation
async function inscriptionActiveExiste(id_etudiant, id_formation, connection = db) {
  const [rows] = await connection.query(
    'SELECT id_inscription FROM inscription WHERE id_etudiant = ? AND id_formation = ? AND etat = true',
    [id_etudiant, id_formation]
  );
  return rows.length > 0;
}

async function getIdUtilisateurByEtudiant(id_etudiant, connection = db) {
  const [rows] = await connection.query(
    'SELECT id_utilisateur FROM etudiant WHERE id_etudiant = ? AND etat = true',
    [id_etudiant]
  );
  return rows[0]?.id_utilisateur || null;
}

// Nouvelle inscription : active mais pas encore validée.
// origine 'en_ligne' = faite par l'étudiant depuis la vitrine de l'application mobile
async function insertInscription(id_etudiant, id_utilisateur, id_formation, connection = db, origine = 'accueil') {
  const sql = `
    INSERT INTO inscription (id_etudiant, id_utilisateur, id_formation, date_inscription, etat, valide, origine)
    VALUES (?, ?, ?, NOW(), true, false, ?)
  `;
  const [result] = await connection.query(sql, [id_etudiant, id_utilisateur, id_formation, origine]);
  return result.insertId;
}

// Ne valide qu'une inscription pas encore validée : renvoie false si elle l'était déjà.
async function setInscriptionValidee(id_inscription, connection = db) {
  const [result] = await connection.query(
    'UPDATE inscription SET valide = true WHERE id_inscription = ? AND valide = false AND etat = true',
    [id_inscription]
  );
  return result.affectedRows > 0;
}

// Tarif et durée de la formation, nécessaires au calcul de l'échéancier
async function findFormationActive(id_formation, connection = db) {
  const [rows] = await connection.query(
    'SELECT id_formation, tarif, duree_jours FROM formation WHERE id_formation = ? AND etat = true',
    [id_formation]
  );
  return rows[0] || null;
}

async function findInscriptionAvecTarif(id_inscription, connection = db) {
  const sql = `
    SELECT i.id_inscription, i.id_etudiant, i.id_formation, i.etat, i.valide,
           f.tarif, f.duree_jours
    FROM inscription i
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.id_inscription = ? AND i.etat = true
  `;
  const [rows] = await connection.query(sql, [id_inscription]);
  return rows[0];
}

// Inscriptions actives avec l'étudiant et la formation
// Filtres de la liste : recherche (étudiant ou formation), validée ou non, statut (en_cours / reussi),
// origine (accueil / en_ligne), dossier de l'étudiant (complet / incomplet), état (actif par défaut)
function filtresInscriptions({ recherche, valide, statut, origine, dossier, etat } = {}) {
  const conditions = [conditionEtat('i.etat', etat)].filter(Boolean);
  const params = [];
  if (recherche) {
    const condition = conditionEtudiantOuFormation('i.id_etudiant', 'i.id_formation', recherche);
    conditions.push(condition.sql);
    params.push(...condition.params);
  }
  if (valide !== undefined) {
    conditions.push('i.valide = ?');
    params.push(valide);
  }
  if (statut) {
    conditions.push(statut === 'reussi' ? ATTESTATION_DELIVREE() : `NOT ${ATTESTATION_DELIVREE()}`);
  }
  if (origine) {
    conditions.push('i.origine = ?');
    params.push(origine);
  }
  if (dossier) {
    conditions.push(`${PIECES_FOURNIES('e')} ${dossier === 'complet' ? '=' : '<'} ${PIECES_DOSSIER.length}`);
  }
  return { where: conditions.join(' AND ') || '1 = 1', params };
}

const FROM_INSCRIPTIONS = `
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation`;

// Inscriptions à valider d'abord, puis les plus récentes ; `pagination` = page demandée (ou null : toutes).
// L'index idx_inscription_liste (valide, date_inscription DESC, id_inscription DESC) donne cet ordre.
async function getAllInscriptions(filtres = {}, pagination = null) {
  const { where, params } = filtresInscriptions(filtres);
  const limite = clauseLimite(pagination);
  const sql = `
    SELECT i.id_inscription, i.date_inscription, i.etat, i.valide, i.origine,
           ${STATUT_INSCRIPTION()} AS statut,
           -- Étudiant ou formation désactivés : affiché dans la liste, les actions sont refusées
           e.etat AS etudiant_actif, f.etat AS formation_active,
           -- Dossier de l'étudiant : pièces fournies sur ${PIECES_DOSSIER.length} (validation en ligne bloquée sinon)
           ${PIECES_FOURNIES('e')} AS pieces_fournies, ${PIECES_DOSSIER.length} AS pieces_total,
           e.id_etudiant, u.id_utilisateur AS id_utilisateur_etudiant, u.email AS email_etudiant,
           u.nom AS nom_etudiant, u.prenom AS prenom_etudiant,
           f.id_formation, f.nom AS nom_formation,
           -- Premier paiement déclaré par l'étudiant (inscription en ligne), en attente de validation
           (SELECT p.reference_virement FROM echeance ec
              JOIN paiement p ON p.id_echeance = ec.id_echeance AND p.etat = true AND p.statut = 'en_attente'
             WHERE ec.id_inscription = i.id_inscription AND ec.etat = true
             ORDER BY ec.date_echeance, p.id_paiement LIMIT 1) AS reference_declaree,
           (SELECT p.montant FROM echeance ec
              JOIN paiement p ON p.id_echeance = ec.id_echeance AND p.etat = true AND p.statut = 'en_attente'
             WHERE ec.id_inscription = i.id_inscription AND ec.etat = true
             ORDER BY ec.date_echeance, p.id_paiement LIMIT 1) AS montant_declare
    ${FROM_INSCRIPTIONS}
    WHERE ${where}
    ORDER BY i.valide ASC, i.date_inscription DESC, i.id_inscription DESC${limite.sql}
  `;
  const [rows] = await db.query(sql, [...params, ...limite.params]);
  return rows;
}

// Nombre d'inscriptions correspondant aux mêmes filtres (total de la pagination).
// Seul le filtre « dossier » lit la fiche étudiant ; sinon on compte sur la seule table inscription
// (chaque inscription a son étudiant et sa formation).
async function compterInscriptions(filtres = {}) {
  const { where, params } = filtresInscriptions(filtres);
  const depuis = filtres.dossier ? 'FROM inscription i JOIN etudiant e ON i.id_etudiant = e.id_etudiant' : 'FROM inscription i';
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${depuis} WHERE ${where}`, params);
  return Number(total);
}

async function getInscriptionById(id_inscription) {
  const sql = `
    SELECT i.*, ${STATUT_INSCRIPTION()} AS statut,
           u.nom AS nom_etudiant, u.prenom AS prenom_etudiant, f.nom AS nom_formation,
           e.etat AS etudiant_actif, f.etat AS formation_active,
           ${PIECES_FOURNIES('e')} AS pieces_fournies, ${PIECES_DOSSIER.length} AS pieces_total,
           -- Pièces du dossier (détail : lesquelles sont fournies ou manquantes)
           ${CHAMPS_DOSSIER.map((c) => `e.${c}`).join(', ')}
    FROM inscription i
    JOIN etudiant e ON i.id_etudiant = e.id_etudiant
    JOIN utilisateur u ON e.id_utilisateur = u.id_utilisateur
    JOIN formation f ON i.id_formation = f.id_formation
    WHERE i.id_inscription = ? AND i.etat = true
  `;
  const [rows] = await db.query(sql, [id_inscription]);
  return rows[0];
}

module.exports = {
  inscriptionActiveExiste, getIdUtilisateurByEtudiant, findFormationActive,
  insertInscription, setInscriptionValidee, findInscriptionAvecTarif,
  getAllInscriptions, compterInscriptions, getInscriptionById,
  STATUT_INSCRIPTION,
};