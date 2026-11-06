// Désactivation et réactivation (suppression logique, colonne etat) des étudiants, formations,
// inscriptions, échéances, paiements, documents administratifs et supports. On ne réactive un élément que si ce dont il dépend
// est actif (ex. pas d'inscription réactivée pour un étudiant désactivé).
const dependanceModel = require('../models/dependanceModel');
const inscriptionModel = require('../models/inscriptionModel');
const paiementModel = require('../models/paiementModel');
const documentModel = require('../models/documentModel');
const dependanceService = require('./dependanceService');
const { avecTransaction } = require('../utils/transaction');
const { ROLES } = require('../config/roles');
const { notFound, conflict, forbidden } = require('../utils/errors');
const { formatMontant } = require('../utils/format');

const LIBELLES = {
  etudiant: { introuvable: 'Étudiant introuvable', deja: { true: 'Cet étudiant est déjà actif.', false: 'Cet étudiant est déjà désactivé.' } },
  formation: { introuvable: 'Formation introuvable', deja: { true: 'Cette formation est déjà active.', false: 'Cette formation est déjà désactivée.' } },
  inscription: { introuvable: 'Inscription introuvable', deja: { true: 'Cette inscription est déjà active.', false: 'Cette inscription est déjà désactivée.' } },
  echeance: { introuvable: 'Échéance introuvable', deja: { true: 'Cette échéance est déjà active.', false: 'Cette échéance est déjà désactivée.' } },
  paiement: { introuvable: 'Paiement introuvable', deja: { true: 'Ce paiement est déjà actif.', false: 'Ce paiement est déjà désactivé.' } },
  document_administratif: { introuvable: 'Document introuvable', deja: { true: 'Ce document est déjà actif.', false: 'Ce document est déjà désactivé.' } },
  support: { introuvable: 'Support introuvable', deja: { true: 'Ce support est déjà actif.', false: 'Ce support est déjà désactivé.' } },
  utilisateur: { introuvable: 'Utilisateur introuvable', deja: { true: 'Ce compte est déjà actif.', false: 'Ce compte est déjà désactivé.' } },
};

// Change l'état ; si rien n'a changé, l'élément est introuvable ou déjà dans cet état
async function changer(table, id, actif) {
  if (await dependanceModel.changerEtat(table, id, actif)) return;
  if (await dependanceModel.existe(table, id)) throw conflict(LIBELLES[table].deja[actif]);
  throw notFound(`${LIBELLES[table].introuvable}.`);
}

// Étudiant et formation ne dépendent de rien : changement direct
const desactiverEtudiant = (id) => changer('etudiant', id, false);
const reactiverEtudiant = (id) => changer('etudiant', id, true);
const desactiverFormation = (id) => changer('formation', id, false);
const reactiverFormation = (id) => changer('formation', id, true);

const desactiverInscription = (id) => changer('inscription', id, false);

async function reactiverInscription(id) {
  const etats = await dependanceService.verifierInscription(id, { ignorer: 'inscription_active' });
  if (!Number(etats.inscription_active)
    && await inscriptionModel.inscriptionActiveExiste(etats.id_etudiant, etats.id_formation)) {
    throw conflict(
      `${etats.etudiant_prenom} ${etats.etudiant_nom} a déjà une inscription active à « ${etats.formation_nom} ».`
    );
  }
  await changer('inscription', id, true);
}

// Désactiver reste permis quand un parent est déjà désactivé (on fait le ménage)
const desactiverEcheance = (id) => changer('echeance', id, false);

async function reactiverEcheance(id) {
  await dependanceService.verifierEcheance(id, { ignorer: 'echeance_active' });
  await changer('echeance', id, true);
}

// Un paiement facturé reste encaissé : sa facture est un document officiel déjà envoyé à l'étudiant
async function desactiverPaiement(id) {
  if (await documentModel.findFacture(id)) {
    throw conflict('Ce paiement a une facture : il ne peut pas être désactivé.');
  }
  await changer('paiement', id, false);
}

// Un paiement validé compte de nouveau dans l'encaissé : refusé si l'échéance a été repayée entre-temps
async function reactiverPaiement(id) {
  const { id_echeance } = await dependanceService.verifierPaiement(id, { ignorer: 'paiement_actif' });

  await avecTransaction(async (connection) => {
    await paiementModel.verrouillerEcheance(id_echeance, connection);
    const paiement = await paiementModel.getPaiementPourControle(id, connection);
    if (!paiement) throw notFound(`${LIBELLES.paiement.introuvable}.`);
    if (paiement.etat) throw conflict(LIBELLES.paiement.deja[true]);

    if (paiement.statut === paiementModel.STATUTS_PAIEMENT.VALIDE) {
      const echeance = await paiementModel.getEcheanceAvecSituation(id_echeance, connection);
      if (!echeance) throw notFound('Échéance introuvable.');
      const resteAPayer = paiementModel.resteAPayer(echeance);
      if (Number(paiement.montant) > resteAPayer) {
        throw conflict(`Ce paiement dépasse le reste à payer (${formatMontant(resteAPayer)}) : il ne peut pas être réactivé.`);
      }
    }
    await dependanceModel.changerEtat('paiement', id, true, connection);
  });
}

// Document administratif : ne dépend de rien (le fichier reste sur le disque)
const desactiverDocument = (id) => changer('document_administratif', id, false);
const reactiverDocument = (id) => changer('document_administratif', id, true);

// Compte utilisateur : ne dépend de rien ; il peut de nouveau se connecter
// (ses anciennes sessions, fermées à la désactivation, restent fermées)
const desactiverUtilisateur = (id) => changer('utilisateur', id, false);
const reactiverUtilisateur = (id) => changer('utilisateur', id, true);

// Fonctionne aussi sur un brouillon
const desactiverSupport = (id) => changer('support', id, false);

// Support : un formateur ne réactive que les siens, et pas dans une formation désactivée
async function reactiverSupport(id, auteur) {
  const support = await dependanceModel.etatsSupport(id);
  if (!support) throw notFound('Support introuvable.');
  if (auteur?.role === ROLES.FORMATEUR && Number(support.id_utilisateur) !== Number(auteur.id)) {
    throw forbidden('Vous ne pouvez réactiver que vos propres supports.');
  }
  if (!Number(support.formation_active)) {
    throw conflict(`La formation « ${support.formation_nom} » est désactivée. Réactivez-la d'abord (page Formations, filtre « Désactivés »).`);
  }
  await changer('support', id, true);
}

module.exports = {
  desactiverDocument, reactiverDocument, desactiverSupport, reactiverSupport,
  desactiverUtilisateur, reactiverUtilisateur,
  desactiverEtudiant, reactiverEtudiant, desactiverFormation, reactiverFormation,
  desactiverInscription, reactiverInscription, desactiverEcheance, reactiverEcheance, desactiverPaiement, reactiverPaiement,
};
