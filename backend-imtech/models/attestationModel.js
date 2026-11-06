// Model des attestations à envoyer : inscriptions dont la formation est terminée et qui n'ont
// pas encore d'attestation (voir services/attestationService.js).
const db = require('../config/db');
const { PAIEMENT_VALIDE } = require('./paiementModel');

// Inscriptions validées et actives (étudiant et formation actifs aussi), formation terminée
// (date d'inscription + durée dépassée), sans attestation ; avec ce qu'il faut pour décider si
// l'attestation est prête : note de présentation et reste à payer (paiements validés seulement).
// depuisJours : seulement les formations terminées depuis au plus ce nombre de jours (tâche
// automatique : sans cette borne, elle relirait chaque heure toutes les inscriptions depuis
// l'ouverture). La borne sur date_inscription utilise l'index idx_inscription_date.
async function getInscriptionsTerminees({ depuisJours = null } = {}) {
  const fenetre = depuisJours === null ? '' : `
      AND i.date_inscription >= DATE_SUB(CURDATE(), INTERVAL ? + (SELECT IFNULL(MAX(duree_jours), 0) FROM formation) DAY)
      AND DATE_ADD(DATE(i.date_inscription), INTERVAL f.duree_jours DAY) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`;
  const sql = `
    SELECT i.id_inscription, i.id_formation, i.note_presentation,
           u.prenom AS etudiant_prenom, u.nom AS etudiant_nom,
           f.nom AS formation_nom, f.id_utilisateur AS id_formateur,
           CONCAT(fo.prenom, ' ', fo.nom) AS formateur,
           DATE_ADD(DATE(i.date_inscription), INTERVAL f.duree_jours DAY) AS date_fin,
           (SELECT IFNULL(SUM(e.montant_prevu), 0) FROM echeance e
             WHERE e.id_inscription = i.id_inscription AND e.etat = true)
           - (SELECT IFNULL(SUM(p.montant), 0) FROM paiement p
               JOIN echeance e ON e.id_echeance = p.id_echeance
              WHERE e.id_inscription = i.id_inscription AND e.etat = true AND ${PAIEMENT_VALIDE('p')}) AS reste_a_payer
    FROM inscription i
    JOIN formation f ON f.id_formation = i.id_formation
    JOIN utilisateur fo ON fo.id_utilisateur = f.id_utilisateur
    JOIN etudiant et ON et.id_etudiant = i.id_etudiant
    JOIN utilisateur u ON u.id_utilisateur = et.id_utilisateur
    WHERE i.etat = true AND i.valide = true AND et.etat = true AND f.etat = true
      AND DATE_ADD(DATE(i.date_inscription), INTERVAL f.duree_jours DAY) <= CURDATE()
      AND NOT EXISTS (SELECT 1 FROM attestation a WHERE a.id_inscription = i.id_inscription)${fenetre}
    ORDER BY date_fin, u.nom, u.prenom
  `;
  const [rows] = await db.query(sql, depuisJours === null ? [] : [depuisJours, depuisJours]);
  return rows;
}

module.exports = { getInscriptionsTerminees };
