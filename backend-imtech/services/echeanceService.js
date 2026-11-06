// Service des échéances : calcul de l'échéancier, consultation, modification et rappels.
const echeanceModel = require('../models/echeanceModel');
const notifService = require('./notifService');
const dependanceService = require('./dependanceService');
const { badRequest, conflict, notFound } = require('../utils/errors');
const { formatMontant } = require('../utils/format');
const { salutation, titre, encadre, formation } = require('../utils/modeleEmail');

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
  if (montant_prevu !== undefined || date_echeance !== undefined) {
    await dependanceService.verifierEcheance(id_echeance);
  }
  const ok = await echeanceModel.updateEcheance(id_echeance, { montant_prevu, date_echeance, etat });
  if (!ok) throw notFound('Échéance non trouvée.');
}

// Bouton « Rappeler » de l'Accueil : notification in-app + e-mail à l'étudiant.
// id_auteur : membre du personnel qui envoie le rappel (il signe l'e-mail).
async function rappelerEcheance(id_echeance, id_auteur = null) {
  await dependanceService.verifierEcheance(id_echeance);
  const echeance = await echeanceModel.getEcheancePourRappel(id_echeance);
  if (!echeance) throw notFound('Échéance non trouvée.');

  const reste = Number(echeance.reste_a_payer);
  if (reste <= 0) throw conflict('Cette échéance est déjà réglée.');
  // reste_non_envoye = reste à payer moins les paiements en attente : s'il est nul,
  // l'étudiant a déjà payé et inutile de le relancer
  if (Number(echeance.reste_non_envoye) <= 0) {
    throw conflict("L'étudiant a déjà envoyé son paiement : il attend la validation de l'accueil (page Paiements).");
  }

  const montant = formatMontant(reste);
  const date = new Date(echeance.date_echeance).toLocaleDateString('fr-FR');

  const resultat = await notifService.notifierEtudiant({
    id_utilisateur: echeance.id_utilisateur,
    email: echeance.email,
    message: `Rappel : ${montant} à régler pour la formation ${echeance.formation_nom} avant le ${date}.`,
    sujet: `IMTECH INFO — Rappel de paiement : échéance du ${date}`,
    contenuHtml: `${titre('Rappel de paiement')}
      ${salutation(echeance.prenom, echeance.nom)}
      <p>Nous espérons que votre formation ${formation(echeance.formation_nom)} se passe bien !
      Nous nous permettons de vous rappeler qu'une <strong>échéance de paiement</strong> arrive à son terme
      — ou est déjà dépassée.</p>
      ${encadre([
        ['Formation', echeance.formation_nom],
        ['Montant à régler', montant],
        ["Date d'échéance", date],
      ])}
      <p>Vous pouvez régler ce montant <strong>en quelques secondes</strong> depuis l'application mobile
      IMTECH INFO (rubrique <strong>Paiements</strong>), ou directement auprès de notre <strong>Accueil</strong>.</p>
      <p>Une difficulté pour payer à temps ? <strong>N'hésitez pas à nous contacter</strong> : nous trouverons
      ensemble une solution.</p>
      <p style="color:#64748b;font-size:13px;">Si vous avez déjà effectué ce règlement, merci de ne pas tenir
      compte de ce message.</p>`,
    id_auteur,
  });
  await echeanceModel.marquerRappelEnvoye(id_echeance);
  return resultat;
}

module.exports = {
  calculerEcheancier, genererEcheancier, listerEcheancesInscription, listerToutesEcheances, modifierEcheance,
  rappelerEcheance,
};
