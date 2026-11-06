// Service des paiements : règles de saisie (étudiant / personnel), validation par l'Accueil
// et récapitulatif des paiements d'un étudiant.
const paiementModel = require('../models/paiementModel');
const notifService = require('./notifService');
const dependanceService = require('./dependanceService');
const documentService = require('./documentService');
const { ROLES } = require('../config/roles');
const { badRequest, forbidden, notFound, conflict } = require('../utils/errors');
const { formatMontant } = require('../utils/format');
const { salutation, titre, encadre, formation } = require('../utils/modeleEmail');

const { STATUTS_PAIEMENT } = paiementModel;

const estEtudiant = (auteur) => auteur?.role === ROLES.ETUDIANT;

// ─────────────────────────────────────────────
// Lecture
// ─────────────────────────────────────────────

// Un étudiant ne voit que ses paiements ; le personnel voit tout (filtrable par statut).
// filtres = { statut, mode, recherche } ; pagination = { page, limite, offset } ou null (toute la liste).
// Un étudiant ne voit que ses paiements. Liste paginée : on renvoie aussi le nombre total de
// paiements en attente (bandeau « à valider » de la page, quel que soit le filtre affiché).
async function listerPaiements(auteur, filtres = {}, pagination = null) {
  if (estEtudiant(auteur)) {
    // Sans fiche étudiant, on ne renvoie rien (et surtout pas la liste complète)
    if (!auteur.id_etudiant) return pagination ? { lignes: [], total: 0 } : [];
    filtres = { ...filtres, id_etudiant: auteur.id_etudiant };
  }
  if (!pagination) return await paiementModel.getAllPaiements(filtres);

  const [lignes, total, enAttente] = await Promise.all([
    paiementModel.getAllPaiements(filtres, pagination),
    paiementModel.compterPaiements(filtres),
    paiementModel.compterPaiements({ id_etudiant: filtres.id_etudiant, statut: STATUTS_PAIEMENT.EN_ATTENTE }),
  ]);
  return { lignes, total, compteurs: { en_attente: enAttente } };
}

// Pour un étudiant, le paiement d'un autre renvoie 404 (on ne révèle pas qu'il existe)
async function recupererPaiement(id_paiement, auteur) {
  const paiement = await paiementModel.getPaiementById(id_paiement);
  if (!paiement) throw notFound('Paiement non trouvé.');
  if (estEtudiant(auteur) && Number(paiement.id_etudiant) !== Number(auteur.id_etudiant)) {
    throw notFound('Paiement non trouvé.');
  }
  return paiement;
}

// ─────────────────────────────────────────────
// Écriture
// ─────────────────────────────────────────────

/**
 * Enregistre un paiement sur une échéance.
 * - Étudiant : uniquement sur SA propre échéance, montant imposé (= montant prévu),
 *   une seule fois, et le paiement reste "en_attente" jusqu'à validation par l'Accueil.
 * - Personnel : paiement validé directement, partiel autorisé, plafonné au reste à payer.
 */
async function enregistrerPaiement({ id_echeance, id_mode_paiement, montant, reference_virement }, auteur) {
  // Personnel : message clair si l'échéance ou ce dont elle dépend est désactivé
  // (pour un étudiant, après le contrôle de propriété : on ne révèle rien d'une autre échéance)
  if (!estEtudiant(auteur)) await dependanceService.verifierEcheance(id_echeance);
  const echeance = await paiementModel.getEcheanceAvecSituation(id_echeance);
  if (!echeance) throw notFound('Échéance introuvable.');

  // Seuls les paiements validés comptent dans ce qui a déjà été payé
  const resteAPayer = Number(echeance.montant_prevu) - Number(echeance.montant_valide);
  if (resteAPayer <= 0) throw conflict('Cette échéance est déjà réglée.');

  if (estEtudiant(auteur)) {
    if (Number(echeance.id_etudiant) !== Number(auteur.id_etudiant)) {
      throw forbidden('Cette échéance ne vous appartient pas.');
    }
    await dependanceService.verifierEcheance(id_echeance);
    if (Number(echeance.nb_en_attente) > 0) {
      throw conflict('Un paiement est déjà en attente de validation pour cette échéance.');
    }
    const id_paiement = await paiementModel.insererPaiement({
      id_echeance,
      id_mode_paiement,
      montant: resteAPayer,
      reference_virement,
      statut: STATUTS_PAIEMENT.EN_ATTENTE,
    });
    await prevenirPersonnelPaiement(id_paiement);
    return id_paiement;
  }

  // Personnel : contrôle du montant saisi ; le paiement est validé tout de suite, facture envoyée
  const montantNum = Number(montant);
  if (!Number.isFinite(montantNum) || montantNum <= 0) {
    throw badRequest('Le montant doit être un nombre positif.');
  }
  if (montantNum > resteAPayer) {
    throw badRequest(`Le montant dépasse le reste à payer (${resteAPayer}).`);
  }

  const id_paiement = await paiementModel.insererPaiement({
    id_echeance,
    id_mode_paiement,
    montant: montantNum,
    reference_virement,
    statut: STATUTS_PAIEMENT.VALIDE,
  });
  envoyerFactureAuto(id_paiement, null, auteur?.id);
  return id_paiement;
}

// Paiement validé : facture créée et envoyée à l'étudiant (notification + e-mail avec le PDF),
// sans faire attendre la réponse. Un échec (e-mail en panne…) n'annule rien ; l'étudiant reçoit
// alors au moins `secours` = { id_utilisateur, message } en notification.
// id_auteur : membre du personnel qui a validé le paiement (il signe l'e-mail).
function envoyerFactureAuto(id_paiement, secours, id_auteur = null) {
  documentService.envoyerFacture(id_paiement, id_auteur).catch((error) => {
    console.warn(`Facture automatique du paiement ${id_paiement} non envoyée :`, error.message);
    if (secours) notifService.notifierInApp(secours.id_utilisateur, secours.message).catch(() => {});
  });
}

// « Étudiant A a payé X Ar » : prévient l'Accueil qu'un paiement attend sa validation.
// Un échec de notification n'annule jamais le paiement.
async function prevenirPersonnelPaiement(id_paiement) {
  try {
    const p = await paiementModel.getPaiementById(id_paiement);
    const montant = formatMontant(p.montant);
    await notifService.notifierPersonnel(
      `${p.etudiant_prenom} ${p.etudiant_nom} a payé ${montant} (${p.formation_nom}) via ${p.mode_paiement}. Paiement à valider.`
    );
  } catch (error) {
    console.warn('Notification du personnel échouée :', error.message);
  }
}

// Correction d'un paiement par le personnel (mode, montant, référence)
async function modifierPaiement(id_paiement, data) {
  await dependanceService.verifierPaiement(id_paiement);
  const ok = await paiementModel.updatePaiement(id_paiement, data);
  if (!ok) throw notFound('Paiement non trouvé.');
}

// Passe un paiement "en_attente" à VALIDE ou REFUSE (une seule fois) et prévient l'étudiant.
// id_auteur : membre du personnel qui traite le paiement (il signe l'e-mail).
async function traiterPaiementEnAttente(id_paiement, statut, id_auteur = null) {
  await dependanceService.verifierPaiement(id_paiement);
  const paiement = await paiementModel.getPaiementById(id_paiement);
  if (!paiement) throw notFound('Paiement non trouvé.');
  if (paiement.statut !== STATUTS_PAIEMENT.EN_ATTENTE) {
    throw conflict('Ce paiement a déjà été traité.');
  }
  await paiementModel.changerStatutPaiementEnAttente(id_paiement, statut);

  // Prévenir l'étudiant ; un échec de notification n'annule pas la validation.
  // Validé : la notification accompagne la facture envoyée automatiquement.
  const montant = formatMontant(paiement.montant);
  if (statut === STATUTS_PAIEMENT.VALIDE) {
    envoyerFactureAuto(id_paiement, {
      id_utilisateur: paiement.id_utilisateur_etudiant,
      message: `Votre paiement de ${montant} (${paiement.formation_nom}) a été validé.`,
    }, id_auteur);
  } else {
    try {
      await notifService.notifierEtudiant({
        id_utilisateur: paiement.id_utilisateur_etudiant,
        email: paiement.email_etudiant,
        message: `Votre paiement de ${montant} (${paiement.formation_nom}) a été refusé. Contactez l'accueil.`,
        sujet: `IMTECH INFO — Paiement non validé : ${paiement.formation_nom}`,
        contenuHtml: `${titre('Paiement non validé')}
          ${salutation(paiement.etudiant_prenom, paiement.etudiant_nom)}
          <p>Nous n'avons malheureusement <strong>pas pu valider</strong> le paiement que vous nous avez
          envoyé pour la formation ${formation(paiement.formation_nom)}.</p>
          ${encadre([
            ['Formation', paiement.formation_nom],
            ['Montant déclaré', montant],
            ['Mode de paiement', paiement.mode_paiement],
            ['Référence', paiement.reference_virement],
            ['Date d\'envoi', new Date(paiement.date_paiement).toLocaleDateString('fr-FR')],
          ])}
          <p>Le plus souvent, la <strong>référence du virement</strong> est introuvable ou le montant ne
          correspond pas. Cette échéance reste donc <strong>à régler</strong>.</p>
          <p>Pas d'inquiétude : <strong>contactez-nous</strong> en répondant simplement à ce message, ou passez
          à l'Accueil. Nous vérifierons ensemble votre paiement.</p>`,
        id_auteur,
      });
    } catch (error) {
      console.warn('Notification de paiement échouée :', error.message);
    }
  }

  return { ...paiement, statut };
}

const validerPaiement = (id_paiement, id_auteur) => traiterPaiementEnAttente(id_paiement, STATUTS_PAIEMENT.VALIDE, id_auteur);
const refuserPaiement = (id_paiement, id_auteur) => traiterPaiementEnAttente(id_paiement, STATUTS_PAIEMENT.REFUSE, id_auteur);

// ─────────────────────────────────────────────
// Dashboard paiement étudiant
// ─────────────────────────────────────────────

// Récapitulatif pour l'étudiant : prochaine échéance, dernier paiement, paiements en attente,
// total dû, total payé et solde restant (requêtes lancées en parallèle)
async function dashboardPaiementEtudiant(id_etudiant) {
  const [prochaine, dernier, totaux, enAttente] = await Promise.all([
    paiementModel.getProchainPaiementEtudiant(id_etudiant),
    paiementModel.getDernierPaiementEtudiant(id_etudiant),
    paiementModel.getTotauxPaiementEtudiant(id_etudiant),
    paiementModel.getAllPaiements({ id_etudiant, statut: STATUTS_PAIEMENT.EN_ATTENTE }),
  ]);

  const total_du = Number(totaux.total_du) || 0;
  const total_paye = Number(totaux.total_paye) || 0;

  return {
    prochaine,
    dernier_paiement: dernier,
    paiements_en_attente: enAttente,
    total_du,
    total_paye,
    solde: total_du - total_paye,
  };
}

module.exports = {
  envoyerFactureAuto,
  listerPaiements,
  recupererPaiement,
  enregistrerPaiement,
  modifierPaiement,
  validerPaiement,
  refuserPaiement,
  dashboardPaiementEtudiant,
};
