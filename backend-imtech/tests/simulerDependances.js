// Simule dependanceModel (aucune requête SQL) : par défaut tout est actif ;
// `etats` remplace certaines valeurs, ex. { etudiant_actif: 0 }.
// Simule aussi la facture envoyée automatiquement après une validation (ni PDF ni e-mail).
const { mock } = require('node:test');
const dependanceModel = require('../models/dependanceModel');
const documentService = require('../services/documentService');

const TOUT_ACTIF = {
  id_inscription: 3, id_etudiant: 7, id_formation: 2,
  inscription_active: 1, etudiant_actif: 1, formation_active: 1,
  etudiant_prenom: 'Rova', etudiant_nom: 'Rakoto', formation_nom: 'Web',
};

function simulerDependances(etats = {}) {
  mock.method(dependanceModel, 'etatsInscription', async () => ({ ...TOUT_ACTIF, ...etats }));
  mock.method(dependanceModel, 'etatsEcheance', async () => ({ id_echeance: 1, echeance_active: 1, ...TOUT_ACTIF, ...etats }));
  mock.method(dependanceModel, 'etatsPaiement', async () => ({
    id_paiement: 3, paiement_actif: 1, echeance_active: 1, ...TOUT_ACTIF, ...etats,
  }));
  // Confirmation d'inscription (fiche PDF + e-mail) envoyée à la validation : simulée aussi
  mock.method(documentService, 'envoyerConfirmationInscription', async () => ({ emailEnvoye: true }));
  return mock.method(documentService, 'envoyerFacture', async () => ({ numeroFacture: 'FAC-TEST' }));
}

module.exports = { simulerDependances };
