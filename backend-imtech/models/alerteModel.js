// Model des alertes automatiques envoyées à l'Accueil (voir services/alerteService.js).
// La table alerte_envoyee mémorise chaque alerte déjà envoyée (type + id concerné).
const db = require('../config/db');
const { ECHEANCE_PROCHE, MONTANT_ENVOYE } = require('./echeanceModel');

const TYPES_ALERTE = Object.freeze({
  ECHEANCE_J2: 'echeance_j2',
  FIN_FORMATION: 'fin_formation',
});

// Échéances passées au statut JAUNE (non soldées, J-2, J-1 ou J), pas encore signalées à l'Accueil.
// L'alerte part dès le passage en jaune (J-2) ; J-1 et J rattrapent le cas où le serveur était éteint.
async function getEcheancesARappeler() {
  const sql = `
    SELECT e.id_echeance, e.date_echeance, f.nom AS formation_nom,
           u.nom AS etudiant_nom, u.prenom AS etudiant_prenom,
           -- un paiement déjà envoyé (même en attente de validation) : pas de rappel
           e.montant_prevu - ${MONTANT_ENVOYE()} AS reste_a_payer
    FROM echeance e
    JOIN inscription i ON i.id_inscription = e.id_inscription
    JOIN etudiant et ON et.id_etudiant = i.id_etudiant
    JOIN utilisateur u ON u.id_utilisateur = et.id_utilisateur
    JOIN formation f ON f.id_formation = i.id_formation
    WHERE e.etat = true AND i.etat = true
      AND ${ECHEANCE_PROCHE()}
      AND NOT EXISTS (
        SELECT 1 FROM alerte_envoyee a
        WHERE a.type = '${TYPES_ALERTE.ECHEANCE_J2}' AND a.id_reference = e.id_echeance
      )
    HAVING reste_a_payer > 0
  `;
  const [rows] = await db.query(sql);
  return rows;
}

// Inscriptions validées dont la formation est terminée
// (date d'inscription + durée en jours dépassée), sans attestation et pas encore signalées.
async function getFormationsTerminees() {
  const sql = `
    SELECT i.id_inscription, f.nom AS formation_nom,
           u.nom AS etudiant_nom, u.prenom AS etudiant_prenom
    FROM inscription i
    JOIN formation f ON f.id_formation = i.id_formation
    JOIN etudiant et ON et.id_etudiant = i.id_etudiant
    JOIN utilisateur u ON u.id_utilisateur = et.id_utilisateur
    WHERE i.etat = true AND i.valide = true
      AND DATE_ADD(DATE(i.date_inscription), INTERVAL f.duree_jours DAY) <= CURDATE()
      AND NOT EXISTS (SELECT 1 FROM attestation a WHERE a.id_inscription = i.id_inscription)
      AND NOT EXISTS (
        SELECT 1 FROM alerte_envoyee a
        WHERE a.type = '${TYPES_ALERTE.FIN_FORMATION}' AND a.id_reference = i.id_inscription
      )
  `;
  const [rows] = await db.query(sql);
  return rows;
}

// Réserve l'alerte : renvoie false si elle a déjà été envoyée (contrainte UNIQUE),
// ce qui garantit qu'une même alerte ne part jamais deux fois.
async function reserverAlerte(type, id_reference) {
  const [result] = await db.query(
    'INSERT IGNORE INTO alerte_envoyee (type, id_reference) VALUES (?, ?)',
    [type, id_reference]
  );
  return result.affectedRows > 0;
}

module.exports = { TYPES_ALERTE, getEcheancesARappeler, getFormationsTerminees, reserverAlerte };
