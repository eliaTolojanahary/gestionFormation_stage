// Attestations de fin de formation : lesquelles sont prêtes, envoi groupé.
//
// Une attestation est PRÊTE quand la formation est terminée (date de fin atteinte), que tout est
// payé (paiements validés), que le formateur a attribué la note de présentation et que l'étudiant
// a commenté son formateur. Sinon elle est
// BLOQUÉE, avec la raison. La tâche horaire (alerteService) envoie toute seule les attestations
// prêtes, dès le jour de fin de la formation ; l'Accueil peut aussi les envoyer d'un clic.
const attestationModel = require('../models/attestationModel');
const documentService = require('./documentService');
const { formatMontant } = require('../utils/format');

// Raisons pour lesquelles une attestation n'est pas encore prête ([] = prête)
function raisonsBlocage(inscription) {
  const raisons = [];
  if (inscription.note_presentation === null || inscription.note_presentation === undefined) {
    raisons.push(`Note de présentation à attribuer par ${inscription.formateur}`);
  }
  if (!Number(inscription.formateur_commente)) {
    raisons.push("Commentaire sur le formateur à écrire par l'étudiant (application mobile)");
  }
  const reste = Number(inscription.reste_a_payer);
  if (reste > 0.009) raisons.push(`Reste à payer : ${formatMontant(reste)}`);
  return raisons;
}

// { pretes: [...], bloquees: [... avec raisons] } parmi les formations terminées sans attestation.
// options.depuisJours : seulement les formations terminées depuis au plus ce nombre de jours
// (tâche automatique) ; sans option, toutes (page de l'Accueil).
async function listerAttestations(options = {}) {
  const pretes = [];
  const bloquees = [];
  for (const inscription of await attestationModel.getInscriptionsTerminees(options)) {
    const raisons = raisonsBlocage(inscription);
    if (raisons.length === 0) pretes.push(inscription);
    else bloquees.push({ ...inscription, raisons });
  }
  return { pretes, bloquees };
}

// Envoie toutes les attestations prêtes (PDF + notification + e-mail), une par une.
// Une erreur sur un étudiant n'empêche pas l'envoi aux autres.
async function envoyerPretes(options = {}) {
  const { pretes } = await listerAttestations(options);
  const envoyees = [];
  const echecs = [];
  for (const inscription of pretes) {
    const nom = `${inscription.etudiant_prenom} ${inscription.etudiant_nom}`;
    try {
      const { emailEnvoye } = await documentService.envoyerAttestation(inscription.id_inscription);
      envoyees.push({ id_inscription: inscription.id_inscription, nom, formation_nom: inscription.formation_nom, emailEnvoye });
    } catch (error) {
      echecs.push({ id_inscription: inscription.id_inscription, nom, message: error.message });
    }
  }
  return { envoyees, echecs };
}

module.exports = { raisonsBlocage, listerAttestations, envoyerPretes };
