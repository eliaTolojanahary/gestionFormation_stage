// Avant une action, vérifie que l'élément et ceux dont il dépend ne sont pas désactivés
// (ex. payer l'échéance d'une inscription dont l'étudiant a été désactivé).
// Un élément désactivé peut être réactivé : le message dit lequel, et où le faire.
const dependanceModel = require('../models/dependanceModel');
const { notFound, conflict } = require('../utils/errors');

const OU = (page) => `(page ${page}, filtre « Désactivés »)`;

// Dans l'ordre : l'élément lui-même, puis ce dont il dépend
const REGLES = [
  ['paiement_actif', () => `Ce paiement est désactivé. Réactivez-le d'abord ${OU('Paiements')}.`],
  ['echeance_active', () => `Cette échéance est désactivée. Réactivez-la d'abord ${OU('Échéances')}.`],
  ['inscription_active', (e) =>
    `L'inscription de ${e.etudiant_prenom} ${e.etudiant_nom} à « ${e.formation_nom} » est désactivée. ` +
    `Réactivez-la d'abord ${OU('Inscriptions')}.`],
  ['etudiant_actif', (e) =>
    `L'étudiant ${e.etudiant_prenom} ${e.etudiant_nom} est désactivé. Réactivez-le d'abord ${OU('Étudiants')}.`],
  ['formation_active', (e) =>
    `La formation « ${e.formation_nom} » est désactivée. Réactivez-la d'abord ${OU('Formations')}.`],
];

// Lève une erreur 409 au premier élément désactivé ; `ignorer` = clé à ne pas contrôler
// (l'élément lui-même quand on le réactive)
function controler(etats, ignorer) {
  for (const [cle, message] of REGLES) {
    if (cle in etats && cle !== ignorer && !Number(etats[cle])) throw conflict(message(etats));
  }
}

async function verifierInscription(id_inscription, { ignorer } = {}) {
  const etats = await dependanceModel.etatsInscription(id_inscription);
  if (!etats) throw notFound('Inscription introuvable.');
  controler(etats, ignorer);
  return etats;
}

async function verifierEcheance(id_echeance, { ignorer } = {}) {
  const etats = await dependanceModel.etatsEcheance(id_echeance);
  if (!etats) throw notFound('Échéance introuvable.');
  controler(etats, ignorer);
  return etats;
}

async function verifierPaiement(id_paiement, { ignorer } = {}) {
  const etats = await dependanceModel.etatsPaiement(id_paiement);
  if (!etats) throw notFound('Paiement introuvable.');
  controler(etats, ignorer);
  return etats;
}

module.exports = { verifierInscription, verifierEcheance, verifierPaiement, controler };
