// Service des échéances : calcul de l'échéancier, consultation, modification et rappels.
const echeanceModel = require('../models/echeanceModel');
const notifService = require('./notifService');
const dependanceService = require('./dependanceService');
const { badRequest, conflict, notFound } = require('../utils/errors');
const { formatMontant } = require('../utils/format');
const { salutation, titre, encadre, formation } = require('../utils/modeleEmail');
const { avecTransaction } = require('../utils/transaction');

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

// Date "AAAA-MM-JJ" (jour local) d'une date lue en base (objet Date) ou déjà au format texte
function jourISO(valeur) {
  if (typeof valeur === 'string') return valeur.slice(0, 10);
  const d = new Date(valeur);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const dateFr = (jour) => new Date(`${jour}T00:00:00`).toLocaleDateString('fr-FR');
const centimes = (montant) => Math.round(Number(montant) * 100);

// Date saisie valide : format AAAA-MM-JJ et jour qui existe (pas de 31 février)
function dateValide(texte) {
  if (typeof texte !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texte)) return false;
  const d = new Date(`${texte}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texte;
}

/**
 * Modification d'une échéance par l'admin (fonction pure, testée dans tests/).
 * `echeances` = toutes les échéances de l'inscription (montant_envoye = validé + en attente).
 * Règles :
 *  - une échéance déjà réglée (tout envoyé) ne se modifie plus ;
 *  - le nouveau montant est > 0 et jamais inférieur à ce que l'étudiant a déjà envoyé ;
 *  - le total dû reste égal au tarif : la différence est reportée sur la DERNIÈRE autre
 *    échéance active non réglée (ex. 100 000 -> 80 000 : la dernière prend 20 000 de plus) ;
 *    elle garde au moins 1 Ar et au moins ce qui y a déjà été envoyé.
 * Retourne les mises à jour à écrire et le détail pour prévenir l'étudiant.
 */
function planifierModification(echeances, id_echeance, { montant_prevu, date_echeance } = {}) {
  const echeance = echeances.find((e) => Number(e.id_echeance) === Number(id_echeance));
  if (!echeance) throw notFound('Échéance non trouvée.');
  if (!Number(echeance.etat)) throw conflict("Cette échéance est désactivée. Réactivez-la d'abord (page Échéances, filtre « Désactivés »).");

  const envoye = centimes(echeance.montant_envoye);
  const ancienMontant = centimes(echeance.montant_prevu);
  if (envoye >= ancienMontant) throw conflict('Cette échéance est déjà réglée : elle ne peut plus être modifiée.');

  const ancienneDate = jourISO(echeance.date_echeance);
  const nouvelleDate = date_echeance === undefined || date_echeance === '' ? ancienneDate : date_echeance;
  if (!dateValide(nouvelleDate)) throw badRequest('Date invalide (format attendu : AAAA-MM-JJ).');

  let nouveauMontant = ancienMontant;
  if (montant_prevu !== undefined && montant_prevu !== '') {
    const valeur = Number(montant_prevu);
    if (!Number.isFinite(valeur) || valeur <= 0) throw badRequest('Le montant doit être un nombre supérieur à 0.');
    nouveauMontant = centimes(valeur);
  }

  if (nouveauMontant === ancienMontant && nouvelleDate === ancienneDate) {
    throw badRequest('Aucune modification : changez la date ou le montant.');
  }
  if (nouveauMontant < envoye) {
    throw badRequest(`Le montant ne peut pas être inférieur à ce que l'étudiant a déjà payé sur cette échéance (${formatMontant(envoye / 100)}).`);
  }

  const modifiee = {
    id_echeance: Number(echeance.id_echeance),
    ancien: { montant_prevu: ancienMontant / 100, date_echeance: ancienneDate },
    montant_prevu: nouveauMontant / 100,
    date_echeance: nouvelleDate,
  };
  const ecart = nouveauMontant - ancienMontant;
  if (ecart === 0) return { modifiee, report: null, misesAJour: [modifiee] };

  // Dernière autre échéance active non réglée (la plus lointaine)
  const cible = echeances
    .filter((e) => Number(e.id_echeance) !== modifiee.id_echeance && Number(e.etat)
      && centimes(e.montant_envoye) < centimes(e.montant_prevu))
    .sort((a, b) => jourISO(b.date_echeance).localeCompare(jourISO(a.date_echeance)) || b.id_echeance - a.id_echeance)[0];
  if (!cible) {
    throw conflict("Aucune autre échéance non réglée pour reporter la différence : seule la date peut être modifiée.");
  }

  const cibleMontant = centimes(cible.montant_prevu);
  const cibleEnvoye = centimes(cible.montant_envoye);
  const cibleNouveau = cibleMontant - ecart;
  // L'autre échéance garde au moins 1 Ar, et au moins ce qui y a déjà été envoyé
  const plancher = Math.max(cibleEnvoye, 100);
  if (cibleNouveau < plancher) {
    const maximum = Math.floor((ancienMontant + cibleMontant - plancher) / 100) * 100; // arrondi à l'ariary inférieur
    throw badRequest(
      `Montant trop élevé : la différence est reportée sur l'échéance du ${dateFr(jourISO(cible.date_echeance))}, ` +
      `qui ne peut pas descendre plus bas. Montant maximal : ${formatMontant(maximum / 100)}.`
    );
  }

  const report = {
    id_echeance: Number(cible.id_echeance),
    ancien: { montant_prevu: cibleMontant / 100 },
    montant_prevu: cibleNouveau / 100,
    date_echeance: jourISO(cible.date_echeance),
  };
  return { modifiee, report, misesAJour: [modifiee, report] };
}

// PUT /echeances/:id (Super Admin) : nouvelle date et/ou nouveau montant, report de la différence
// sur la dernière échéance non réglée (dans la même transaction), puis l'étudiant est prévenu
// (notification in-app + e-mail). id_auteur = l'admin, qui signe l'e-mail.
async function modifierEcheance(id_echeance, donnees = {}, id_auteur = null) {
  await dependanceService.verifierEcheance(id_echeance);
  const info = await echeanceModel.getEcheancePourRappel(id_echeance);
  if (!info) throw notFound('Échéance non trouvée.');

  const plan = await avecTransaction(async (connection) => {
    const echeances = await echeanceModel.getEcheancesPourModification(connection, info.id_inscription);
    const resultat = planifierModification(echeances, id_echeance, donnees);
    for (const maj of resultat.misesAJour) {
      await echeanceModel.modifierMontantEtDate(connection, maj);
    }
    return resultat;
  });

  const { modifiee, report } = plan;
  const lignes = [
    ['Formation', info.formation_nom],
    ['Ancienne échéance', `${formatMontant(modifiee.ancien.montant_prevu)} au ${dateFr(modifiee.ancien.date_echeance)}`],
    ['Nouvelle échéance', `${formatMontant(modifiee.montant_prevu)} au ${dateFr(modifiee.date_echeance)}`],
  ];
  if (report) {
    lignes.push([
      `Échéance du ${dateFr(report.date_echeance)}`,
      `${formatMontant(report.ancien.montant_prevu)} → ${formatMontant(report.montant_prevu)}`,
    ]);
  }

  const { emailEnvoye } = await notifService.notifierEtudiant({
    id_utilisateur: info.id_utilisateur,
    email: info.email,
    message: `Votre échéance de la formation ${info.formation_nom} a été modifiée : ` +
      `${formatMontant(modifiee.montant_prevu)} à régler avant le ${dateFr(modifiee.date_echeance)}.` +
      (report ? ` L'échéance du ${dateFr(report.date_echeance)} passe à ${formatMontant(report.montant_prevu)}.` : ''),
    sujet: `Imteaching Formation — Modification de votre échéancier : ${info.formation_nom}`,
    contenuHtml: `${titre('Votre échéancier a été modifié')}
      ${salutation(info.prenom, info.nom)}
      <p>Une échéance de paiement de votre formation ${formation(info.formation_nom)} a été modifiée
      par notre administration.</p>
      ${encadre(lignes)}
      ${report ? '<p>Le montant total de votre formation ne change pas : la différence a été reportée sur votre dernière échéance.</p>' : ''}
      <p>Vous retrouvez votre échéancier à jour dans l'application mobile Imteaching Formation
      (rubrique <strong>Paiements</strong>).</p>`,
    id_auteur,
  });

  return { emailEnvoye, report };
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
    sujet: `Imteaching Formation — Rappel de paiement : échéance du ${date}`,
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
      Imteaching Formation (rubrique <strong>Paiements</strong>), ou directement auprès de notre <strong>Accueil</strong>.</p>
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
  calculerEcheancier, genererEcheancier, listerEcheancesInscription, listerToutesEcheances,
  planifierModification, modifierEcheance,
  rappelerEcheance,
};
