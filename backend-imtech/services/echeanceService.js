// Service des échéances : calcul de l'échéancier, consultation, modification et rappels.
const echeanceModel = require('../models/echeanceModel');
const notifService = require('./notifService');
const { badRequest, conflict, notFound } = require('../utils/errors');

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Calcule les échéances d'une inscription (fonction pure, testée dans tests/).
 * Les montants sont arrondis au centime ; la dernière tranche absorbe l'écart d'arrondi
 * pour que la somme soit exactement égale au tarif.
 * Les dates sont réparties régulièrement sur la durée de la formation :
 * tranche n à dateDebut + n × (dureeJours / nombreTranches) jours.
 * Ex. 300 000 Ar, 90 jours, 3 tranches -> 100 000 à J+30, J+60 et J+90.
 */
function calculerEcheancier({ tarifTotal, dureeJours, nombreTranches, dateDebut = new Date() }) {
  const nb = Number(nombreTranches);
  const tarif = Number(tarifTotal);
  if (!Number.isInteger(nb) || nb < 1) throw badRequest('Le nombre de tranches doit être un entier supérieur ou égal à 1.');
  if (!Number.isFinite(tarif) || tarif < 0) throw badRequest('Tarif de formation invalide.');

  const intervalleJours = Math.floor(Number(dureeJours) / nb) || 0;
  // Calcul en centimes (entiers) pour éviter les erreurs d'arrondi des nombres à virgule
  const tarifCentimes = Math.round(tarif * 100);
  const montantCentimes = Math.floor(tarifCentimes / nb);

  return Array.from({ length: nb }, (_, index) => {
    const n = index + 1;
    const estDerniere = n === nb;
    const centimes = estDerniere ? tarifCentimes - montantCentimes * (nb - 1) : montantCentimes;
    return {
      montant: centimes / 100,
      date: new Date(dateDebut.getTime() + intervalleJours * n * JOUR_MS).toISOString().split('T')[0],
    };
  });
}

// Calcule puis insère en base les échéances d'une nouvelle inscription.
// À appeler dans une transaction (connection fournie par avecTransaction).
async function genererEcheancier(connection, { id_inscription, tarifTotal, dureeJours, nombreTranches, id_tranche }) {
  const echeances = calculerEcheancier({ tarifTotal, dureeJours, nombreTranches });
  const values = echeances.map(({ montant, date }) => [
    id_inscription,
    id_tranche,
    montant,
    date,
    true, // genere_auto
    true, // etat
  ]);
  await echeanceModel.insertEcheances(connection, values);
}

async function listerEcheancesInscription(id_inscription) {
  return await echeanceModel.getEcheancesByInscription(id_inscription);
}

// filtres = { recherche, statut (VERT / JAUNE / ROUGE) } ; pagination = { page, limite, offset } ou null
async function listerToutesEcheances(filtres = {}, pagination = null) {
  if (!pagination) return await echeanceModel.getAllEcheances(filtres);
  const [lignes, total] = await Promise.all([
    echeanceModel.getAllEcheances(filtres, pagination),
    echeanceModel.compterEcheances(filtres),
  ]);
  return { lignes, total };
}

async function modifierEcheance(id_echeance, { montant_prevu, date_echeance, etat }) {
  const ok = await echeanceModel.updateEcheance(id_echeance, { montant_prevu, date_echeance, etat });
  if (!ok) throw notFound('Échéance non trouvée.');
}

// Bouton « Rappeler » de l'Accueil : notification in-app + e-mail à l'étudiant
async function rappelerEcheance(id_echeance) {
  const echeance = await echeanceModel.getEcheancePourRappel(id_echeance);
  if (!echeance) throw notFound('Échéance non trouvée.');

  const reste = Number(echeance.reste_a_payer);
  if (reste <= 0) throw conflict('Cette échéance est déjà réglée.');
  // reste_non_envoye = reste à payer moins les paiements en attente : s'il est nul,
  // l'étudiant a déjà payé et inutile de le relancer
  if (Number(echeance.reste_non_envoye) <= 0) {
    throw conflict("L'étudiant a déjà envoyé son paiement : il attend la validation de l'accueil (page Paiements).");
  }

  const montant = reste.toLocaleString('fr-FR');
  const date = new Date(echeance.date_echeance).toLocaleDateString('fr-FR');

  const resultat = await notifService.notifierEtudiant({
    id_utilisateur: echeance.id_utilisateur,
    email: echeance.email,
    message: `Rappel : ${montant} MGA à régler pour la formation ${echeance.formation_nom} avant le ${date}.`,
    sujet: 'Rappel de paiement IMTECH INFO',
    contenuHtml: `<p>Bonjour ${echeance.prenom},</p>
      <p>Nous vous rappelons qu'un montant de <strong>${montant} MGA</strong> reste à régler
      pour la formation <strong>${echeance.formation_nom}</strong>, avant le <strong>${date}</strong>.</p>
      <p>Vous pouvez payer depuis l'application mobile IMTECH ou à l'accueil.</p>`,
  });
  await echeanceModel.marquerRappelEnvoye(id_echeance);
  return resultat;
}

module.exports = {
  calculerEcheancier, genererEcheancier, listerEcheancesInscription, listerToutesEcheances, modifierEcheance,
  rappelerEcheance,
};
