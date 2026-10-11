// Service des inscriptions : création (avec échéancier) et validation (avec premier paiement).
const inscriptionModel = require('../models/inscriptionModel');
const echeanceModel = require('../models/echeanceModel');
const paiementModel = require('../models/paiementModel');
const { genererEcheancier } = require('./echeanceService');
const { avecTransaction } = require('../utils/transaction');
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
async function validerInscription(id_inscription, id_mode_paiement, reference_virement) {
  return await avecTransaction(async (connection) => {
    const echeances = await echeanceModel.getEcheancesByInscription(id_inscription, connection);
    if (echeances.length === 0) throw conflict('Aucune échéance trouvée pour cette inscription.');

    const validee = await inscriptionModel.setInscriptionValidee(id_inscription, connection);
    if (!validee) throw conflict('Inscription introuvable ou déjà validée.');

    const premiereEcheance = echeances[0];
    const declare = await paiementModel.getPaiementEnAttenteEcheance(premiereEcheance.id_echeance, connection);
    if (declare) {
      await paiementModel.validerPaiementDeclare(declare.id_paiement, { id_mode_paiement, reference_virement }, connection);
      return { id_inscription, id_paiement: declare.id_paiement };
    }

    // Saisi par le personnel : le paiement est enregistré directement comme VALIDE (pas d'attente)
    const id_paiement = await paiementModel.insererPaiement({
      id_echeance: premiereEcheance.id_echeance,
      id_mode_paiement,
      montant: premiereEcheance.montant_prevu,
      reference_virement,
      statut: paiementModel.STATUTS_PAIEMENT.VALIDE,
    }, connection);

    return { id_inscription, id_paiement };
  });
}

// filtres = { recherche, valide, origine } ; pagination = { page, limite, offset } ou null (toute la liste)
async function listerInscriptions(filtres = {}, pagination = null) {
  if (!pagination) return await inscriptionModel.getAllInscriptions(filtres);
  const [lignes, total] = await Promise.all([
    inscriptionModel.getAllInscriptions(filtres, pagination),
    inscriptionModel.compterInscriptions(filtres),
  ]);
  return { lignes, total };
}

async function recupererInscription(id) {
  const inscription = await inscriptionModel.getInscriptionById(id);
  if (!inscription) throw notFound('Inscription introuvable.');
  return inscription;
}

async function supprimerInscription(id) {
  const ok = await inscriptionModel.deleteInscription(id);
  if (!ok) throw notFound('Inscription introuvable.');
}

module.exports = {
  creerInscriptionDans, creerInscription, validerInscription, listerInscriptions,
  recupererInscription, supprimerInscription
};
