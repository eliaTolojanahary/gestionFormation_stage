// Service des paiements : règles de saisie (étudiant / personnel), validation par l'Accueil
// et récapitulatif des paiements d'un étudiant.
const paiementModel = require('../models/paiementModel');
const notifService = require('./notifService');
const { ROLES } = require('../config/roles');
const { badRequest, forbidden, notFound, conflict } = require('../utils/errors');

const { STATUTS_PAIEMENT } = paiementModel;

const estEtudiant = (auteur) => auteur?.role === ROLES.ETUDIANT;

// ─────────────────────────────────────────────
// Lecture
// ─────────────────────────────────────────────

// Un étudiant ne voit que ses paiements ; le personnel voit tout (filtrable par statut).
async function listerPaiements(auteur, { statut } = {}) {
  if (estEtudiant(auteur)) {
    // Sans fiche étudiant, on ne renvoie rien (et surtout pas la liste complète)
    if (!auteur.id_etudiant) return [];
    return await paiementModel.getAllPaiements({ id_etudiant: auteur.id_etudiant, statut });
  }
  return await paiementModel.getAllPaiements({ statut });
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
  const echeance = await paiementModel.getEcheanceAvecSituation(id_echeance);
  if (!echeance) throw notFound('Échéance introuvable.');

  // Seuls les paiements validés comptent dans ce qui a déjà été payé
  const resteAPayer = Number(echeance.montant_prevu) - Number(echeance.montant_valide);
  if (resteAPayer <= 0) throw conflict('Cette échéance est déjà réglée.');

  if (estEtudiant(auteur)) {
    if (Number(echeance.id_etudiant) !== Number(auteur.id_etudiant)) {
      throw forbidden('Cette échéance ne vous appartient pas.');
    }
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

  // Personnel : contrôle du montant saisi
  const montantNum = Number(montant);
  if (!Number.isFinite(montantNum) || montantNum <= 0) {
    throw badRequest('Le montant doit être un nombre positif.');
  }
  if (montantNum > resteAPayer) {
    throw badRequest(`Le montant dépasse le reste à payer (${resteAPayer}).`);
  }

  return await paiementModel.insererPaiement({
    id_echeance,
    id_mode_paiement,
    montant: montantNum,
    reference_virement,
    statut: STATUTS_PAIEMENT.VALIDE,
  });
}

// « Étudiant A a payé X MGA » : prévient l'Accueil qu'un paiement attend sa validation.
// Un échec de notification n'annule jamais le paiement.
async function prevenirPersonnelPaiement(id_paiement) {
  try {
    const p = await paiementModel.getPaiementById(id_paiement);
    const montant = Number(p.montant).toLocaleString('fr-FR');
    await notifService.notifierPersonnel(
      `${p.etudiant_prenom} ${p.etudiant_nom} a payé ${montant} MGA (${p.formation_nom}) via ${p.mode_paiement}. Paiement à valider.`
    );
  } catch (error) {
    console.warn('Notification du personnel échouée :', error.message);
  }
}

// Correction d'un paiement par le personnel (mode, montant, référence)
async function modifierPaiement(id_paiement, data) {
  const ok = await paiementModel.updatePaiement(id_paiement, data);
  if (!ok) throw notFound('Paiement non trouvé.');
}

// Passe un paiement "en_attente" à VALIDE ou REFUSE (une seule fois) et prévient l'étudiant
async function traiterPaiementEnAttente(id_paiement, statut) {
  const paiement = await paiementModel.getPaiementById(id_paiement);
  if (!paiement) throw notFound('Paiement non trouvé.');
  if (paiement.statut !== STATUTS_PAIEMENT.EN_ATTENTE) {
    throw conflict('Ce paiement a déjà été traité.');
  }
  await paiementModel.changerStatutPaiementEnAttente(id_paiement, statut);

  // Prévenir l'étudiant ; un échec de notification n'annule pas la validation
  const montant = Number(paiement.montant).toLocaleString('fr-FR');
  const message = statut === STATUTS_PAIEMENT.VALIDE
    ? `Votre paiement de ${montant} MGA (${paiement.formation_nom}) a été validé.`
    : `Votre paiement de ${montant} MGA (${paiement.formation_nom}) a été refusé. Contactez l'accueil.`;
  try {
    await notifService.notifierInApp(paiement.id_utilisateur_etudiant, message);
  } catch (error) {
    console.warn('Notification de paiement échouée :', error.message);
  }

  return { ...paiement, statut };
}

const validerPaiement = (id_paiement) => traiterPaiementEnAttente(id_paiement, STATUTS_PAIEMENT.VALIDE);
const refuserPaiement = (id_paiement) => traiterPaiementEnAttente(id_paiement, STATUTS_PAIEMENT.REFUSE);

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
  listerPaiements,
  recupererPaiement,
  enregistrerPaiement,
  modifierPaiement,
  validerPaiement,
  refuserPaiement,
  dashboardPaiementEtudiant,
};
