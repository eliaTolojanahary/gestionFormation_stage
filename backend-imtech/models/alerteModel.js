// Model des alertes automatiques envoyées à l'Accueil (voir services/alerteService.js).
// La table alerte_envoyee mémorise chaque alerte déjà envoyée (type + id concerné).
const db = require('../config/db');
const { ECHEANCE_PROCHE, MONTANT_ENVOYE } = require('./echeanceModel');

const TYPES_ALERTE = Object.freeze({
  ECHEANCE_J2: 'echeance_j2',
  NOTE_MANQUANTE: 'note_manquante',       // formateur prévenu : note de présentation à attribuer
  COMMENTAIRE_FORMATEUR: 'commentaire_fo', // étudiant prévenu (chaque jour) : commentaire de fin de formation à écrire
  ATTESTATION_PROCHE: 'attestation_j2',   // Accueil prévenu à J-2 : attestation bientôt prête, en attente du commentaire
  DECROCHAGE: 'decrochage',               // Accueil prévenu : inscription passée « à contacter » (effacée au retour à la normale)
  RELANCE_DECROCHAGE: 'relance_decrochage', // date de la dernière relance de l'étudiant (bouton « Relancer »)
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
    -- étudiant ou formation désactivés : pas de rappel (comme le bouton « Rappeler »)
    WHERE e.etat = true AND i.etat = true AND et.etat = true AND f.etat = true
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

// Réserve l'alerte : renvoie false si elle a déjà été envoyée (contrainte UNIQUE),
// ce qui garantit qu'une même alerte ne part jamais deux fois.
async function reserverAlerte(type, id_reference) {
  const [result] = await db.query(
    'INSERT IGNORE INTO alerte_envoyee (type, id_reference) VALUES (?, ?)',
    [type, id_reference]
  );
  return result.affectedRows > 0;
}

// Alerte répétée une fois par jour : 'nouvelle' la première fois, 'relance' les jours suivants,
// null si elle est déjà partie aujourd'hui. La date du dernier envoi reste dans alerte_envoyee.
async function reserverAlerteDuJour(type, id_reference) {
  if (await reserverAlerte(type, id_reference)) return 'nouvelle';
  const [result] = await db.query(
    `UPDATE alerte_envoyee SET date_envoi = NOW()
     WHERE type = ? AND id_reference = ? AND DATE(date_envoi) < CURDATE()`,
    [type, id_reference]
  );
  return result.affectedRows > 0 ? 'relance' : null;
}

// Efface les alertes d'un type sauf celles des ids encore concernés : une situation revenue à la
// normale pourra de nouveau déclencher une alerte si elle se reproduit (une alerte par épisode)
async function oublierAlertesSauf(type, idsGardes) {
  if (!idsGardes.length) {
    await db.query('DELETE FROM alerte_envoyee WHERE type = ?', [type]);
    return;
  }
  await db.query('DELETE FROM alerte_envoyee WHERE type = ? AND id_reference NOT IN (?)', [type, idsGardes]);
}

module.exports = { TYPES_ALERTE, getEcheancesARappeler, reserverAlerte, reserverAlerteDuJour, oublierAlertesSauf };
