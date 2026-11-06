// Service des inscriptions : création (avec échéancier) et validation (avec premier paiement).
const inscriptionModel = require('../models/inscriptionModel');
const etudiantModel = require('../models/etudiantModel');
const echeanceModel = require('../models/echeanceModel');
const paiementModel = require('../models/paiementModel');
const { genererEcheancier } = require('./echeanceService');
const dependanceService = require('./dependanceService');
const etatService = require('./etatService');
const paiementService = require('./paiementService');
const documentService = require('./documentService');
const { avecTransaction } = require('../utils/transaction');
const { piecesManquantes, etatDossier } = require('../config/dossier');
const { notFound, conflict } = require('../utils/errors');

// Crée l'inscription et son échéancier avec `connection` (transaction en cours).
// Partagée par l'inscription faite par l'Accueil et par l'inscription en ligne.
async function creerInscriptionDans(connection, { id_etudiant, id_formation, nombre_tranches, id_tranche, origine }) {
  const id_utilisateur = await inscriptionModel.getIdUtilisateurByEtudiant(id_etudiant, connection);
  if (!id_utilisateur) throw notFound('Étudiant introuvable.');

  const formation = await inscriptionModel.findFormationActive(id_formation, connection);
  if (!formation) throw notFound('Formation introuvable.');

  if (await inscriptionModel.inscriptionActiveExiste(id_etudiant, id_formation, connection)) {
    throw conflict('Cet étudiant est déjà inscrit à cette formation.');
  }

  const id_inscription = await inscriptionModel.insertInscription(id_etudiant, id_utilisateur, id_formation, connection, origine);

  await genererEcheancier(connection, {
    id_inscription,
    tarifTotal: formation.tarif,
    dureeJours: formation.duree_jours,
    nombreTranches: parseInt(nombre_tranches, 10),
    id_tranche,
  });

  return id_inscription;
}

// Inscription + échéancier dans la même transaction : jamais d'inscription sans échéances.
async function creerInscription({ id_etudiant, id_formation, nombre_tranches, id_tranche }) {
  return await avecTransaction((connection) =>
    creerInscriptionDans(connection, { id_etudiant, id_formation, nombre_tranches, id_tranche })
  );
}

// Valide l'inscription et enregistre le paiement de la première échéance (une seule fois).
// Inscription en ligne : le premier paiement a déjà été déclaré par l'étudiant (en attente) ;
// il est validé (mode et référence corrigeables) au lieu d'en créer un second.
// Inscription en ligne : refusée tant que le dossier de l'étudiant n'est pas complet (config/dossier.js).
// Inscription faite à l'Accueil : jamais bloquée (c'est l'Accueil qui complète le dossier) ; les
// pièces manquantes sont renvoyées dans `pieces_manquantes` pour l'avertir.
// id_auteur : membre du personnel qui valide (il signe les e-mails envoyés à l'étudiant).
async function validerInscription(id_inscription, id_mode_paiement, reference_virement, id_auteur = null) {
  const etats = await dependanceService.verifierInscription(id_inscription); // étudiant ou formation désactivés ?
  const manquantes = etats.origine === 'en_ligne'
    ? await verifierDossierComplet(etats.id_etudiant)
    : piecesManquantes(await etudiantModel.getEtudiantById(etats.id_etudiant));
  const resultat = await avecTransaction(async (connection) => {
    const echeances = await echeanceModel.getEcheancesByInscription(id_inscription, connection);
    if (echeances.length === 0) throw conflict('Aucune échéance trouvée pour cette inscription.');

    const validee = await inscriptionModel.setInscriptionValidee(id_inscription, connection);
    if (!validee) throw conflict('Inscription introuvable ou déjà validée.');

    const premiereEcheance = echeances[0];
    const declare = await paiementModel.getPaiementEnAttenteEcheance(premiereEcheance.id_echeance, connection);
    if (declare) {
      await paiementModel.validerPaiementDeclare(declare.id_paiement, { id_mode_paiement, reference_virement, id_utilisateur: id_auteur }, connection);
      return { id_inscription, id_paiement: declare.id_paiement };
    }

    // Saisi par le personnel : le paiement est enregistré directement comme VALIDE (pas d'attente)
    const id_paiement = await paiementModel.insererPaiement({
      id_echeance: premiereEcheance.id_echeance,
      id_mode_paiement,
      id_utilisateur: id_auteur,
      montant: premiereEcheance.montant_prevu,
      reference_virement,
      statut: paiementModel.STATUTS_PAIEMENT.VALIDE,
    }, connection);

    return { id_inscription, id_paiement };
  });
  // Après la transaction, sans faire attendre : confirmation d'inscription avec la fiche PDF,
  // puis facture du premier paiement. Un échec d'envoi n'annule pas la validation.
  documentService.envoyerConfirmationInscription(id_inscription, id_auteur).catch((error) => {
    console.warn(`Confirmation de l'inscription ${id_inscription} non envoyée :`, error.message);
  });
  paiementService.envoyerFactureAuto(resultat.id_paiement, null, id_auteur);
  return { ...resultat, pieces_manquantes: manquantes };
}

// 409 avec la liste des pièces manquantes ; l'étudiant les dépose depuis le mobile (Mon dossier)
async function verifierDossierComplet(id_etudiant) {
  const manquantes = piecesManquantes(await etudiantModel.getEtudiantById(id_etudiant));
  if (manquantes.length > 0) {
    throw conflict(
      `Dossier incomplet : ${manquantes.join(', ')}. ` +
      "L'étudiant doit déposer ces pièces depuis l'application mobile (menu ⋮ > Mon dossier), ou l'Accueil depuis sa fiche."
    );
  }
  return manquantes;
}

// filtres = { recherche, valide, statut, origine, dossier, etat } ; pagination = { page, limite, offset } ou null (toute la liste)
async function listerInscriptions(filtres = {}, pagination = null) {
  if (!pagination) return await inscriptionModel.getAllInscriptions(filtres);
  const [lignes, total] = await Promise.all([
    inscriptionModel.getAllInscriptions(filtres, pagination),
    inscriptionModel.compterInscriptions(filtres),
  ]);
  return { lignes, total };
}

// Détail : avec le dossier de l'étudiant (chaque pièce fournie ou manquante)
async function recupererInscription(id) {
  const inscription = await inscriptionModel.getInscriptionById(id);
  if (!inscription) throw notFound('Inscription introuvable.');
  return { ...inscription, dossier: etatDossier(inscription) };
}

async function supprimerInscription(id) {
  await etatService.desactiverInscription(id);
}

module.exports = {
  creerInscriptionDans, creerInscription, validerInscription, listerInscriptions,
  recupererInscription, supprimerInscription
};
