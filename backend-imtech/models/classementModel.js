// Model du classement : présence et paiements des étudiants d'une formation, notes d'attestation.
const db = require('../config/db');
const { PAIEMENT_ACTIF } = require('./paiementModel');

// Données de chaque étudiant inscrit à une formation, pour calculer sa note système :
// - date_debut / duree_jours : période de la formation (début = date d'inscription)
// - nb_presences : jours de semaine (lundi à vendredi) où l'étudiant a utilisé l'application
//   pendant la formation (table presence, remplie automatiquement)
// - échéances dont le jour suivant la date d'échéance est passé :
//   nb_payees_en_retard : pas soldées le jour de l'échéance, mais soldées le jour suivant ;
//   nb_non_reglees      : toujours pas soldées le jour suivant (même si payées plus tard).
//   C'est la date d'envoi qui compte : un paiement envoyé à temps mais pas encore validé
//   par l'Accueil n'est pas un retard. Seuls les paiements refusés sont ignorés.
async function getActiviteFormation(id_formation) {
  // Somme des paiements d'une échéance envoyés jusqu'à la date donnée (expression SQL)
  const paye = (jusquA) => `COALESCE((
                     SELECT SUM(p.montant) FROM paiement p
                      WHERE p.id_echeance = e.id_echeance AND ${PAIEMENT_ACTIF()}
                        AND DATE(p.date_paiement) <= ${jusquA}
                   ), 0)`;
  const jourSuivant = 'DATE_ADD(e.date_echeance, INTERVAL 1 DAY)';
  const echeancesDues = `FROM echeance e
             WHERE e.id_inscription = i.id_inscription AND e.etat = true
               AND ${jourSuivant} < CURDATE()`;
  const sql = `
    SELECT i.id_inscription, i.id_etudiant, i.note_presentation,
           DATE(i.date_inscription) AS date_debut, f.duree_jours,
           u.id_utilisateur, u.nom, u.prenom, u.photo,
           (SELECT COUNT(*)
              FROM presence p
             WHERE p.id_utilisateur = u.id_utilisateur
               AND p.jour >= DATE(i.date_inscription)
               AND p.jour < DATE_ADD(DATE(i.date_inscription), INTERVAL f.duree_jours DAY)
               AND DAYOFWEEK(p.jour) NOT IN (1, 7)
           ) AS nb_presences,
           (SELECT COUNT(*) ${echeancesDues}
               AND ${paye('e.date_echeance')} < e.montant_prevu
               AND ${paye(jourSuivant)} >= e.montant_prevu
           ) AS nb_payees_en_retard,
           (SELECT COUNT(*) ${echeancesDues}
               AND ${paye(jourSuivant)} < e.montant_prevu
           ) AS nb_non_reglees
    FROM inscription i
    JOIN formation f ON f.id_formation = i.id_formation
    JOIN etudiant et ON et.id_etudiant = i.id_etudiant
    JOIN utilisateur u ON u.id_utilisateur = et.id_utilisateur
    WHERE i.id_formation = ? AND i.etat = true
  `;
  const [rows] = await db.query(sql, [id_formation]);
  return rows;
}

// Enregistre la note système calculée et le nombre de présences de chaque inscription :
// un UPDATE par paquet de TAILLE_PAQUET inscriptions (et non un par étudiant)
const TAILLE_PAQUET = 500;
async function enregistrerSuggestions(lignes) {
  for (let debut = 0; debut < lignes.length; debut += TAILLE_PAQUET) {
    const paquet = lignes.slice(debut, debut + TAILLE_PAQUET);
    const valeurs = paquet.map(() => 'SELECT ? AS id, ? AS note, ? AS nb').join(' UNION ALL ');
    await db.query(
      `UPDATE inscription i JOIN (${valeurs}) v ON v.id = i.id_inscription
       SET i.note_suggeree = v.note, i.nb_presences = v.nb`,
      paquet.flatMap(({ id_inscription, note_suggeree, nb_presences }) => [id_inscription, note_suggeree, nb_presences])
    );
  }
}

// Inscription + formateur de la formation (pour vérifier qui peut noter)
async function getInscriptionAvecFormateur(id_inscription) {
  const [rows] = await db.query(
    `SELECT i.id_inscription, i.id_formation, f.id_utilisateur AS id_formateur
     FROM inscription i JOIN formation f ON f.id_formation = i.id_formation
     WHERE i.id_inscription = ? AND i.etat = true`,
    [id_inscription]
  );
  return rows[0] || null;
}

// Note de présentation (sur 10) donnée par le formateur ; null = pas encore notée
async function setNotePresentation(id_inscription, note) {
  await db.query('UPDATE inscription SET note_presentation = ? WHERE id_inscription = ?', [note, id_inscription]);
}

module.exports = { getActiviteFormation, enregistrerSuggestions, getInscriptionAvecFormateur, setNotePresentation };
