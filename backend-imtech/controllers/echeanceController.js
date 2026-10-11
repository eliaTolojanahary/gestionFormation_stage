// Controller des échéances (tranches de paiement d'une inscription).
const echeanceService = require('../services/echeanceService');
const { lirePagination, texteRecherche, reponsePaginee } = require('../utils/pagination');

// GET /inscriptions/:id/echeances : échéancier d'une inscription
async function getEcheancesByInscriptionController(req, res) {
  const echeances = await echeanceService.listerEcheancesInscription(req.params.id);
  res.json({ status: 'success', data: echeances });
}

// GET /echeances : toutes les échéances (suivi par l'Accueil)
// Query : ?recherche= (étudiant ou formation), ?statut=VERT|JAUNE|ROUGE ; ?page=&limite= pour une
// liste paginée (un autre statut est ignoré)
async function listerEcheances(req, res) {
  const pagination = lirePagination(req.query);
  const filtres = {
    recherche: texteRecherche(req.query.recherche),
    statut: ['VERT', 'JAUNE', 'ROUGE'].includes(req.query.statut) ? req.query.statut : undefined,
  };
  const resultat = await echeanceService.listerToutesEcheances(filtres, pagination);
  res.json(pagination ? reponsePaginee(resultat, pagination) : { status: 'success', data: resultat });
}

// PUT /echeances/:id
async function updateEcheanceController(req, res) {
  await echeanceService.modifierEcheance(req.params.id, req.body);
  res.json({ status: 'success', message: 'Échéance mise à jour.' });
}

// POST /echeances/:id/rappeler : rappel manuel de l'Accueil (notification in-app + e-mail).
// La notification est toujours créée ; `emailEnvoye` indique si l'e-mail est parti.
async function rappelerEcheanceController(req, res) {
  const { emailEnvoye } = await echeanceService.rappelerEcheance(req.params.id);
  res.json({
    status: 'success',
    emailEnvoye,
    message: emailEnvoye
      ? "Rappel envoyé à l'étudiant (notification et e-mail)."
      : "Notification envoyée à l'étudiant, mais l'e-mail n'a pas pu partir.",
  });
}

module.exports = { updateEcheanceController, listerEcheances, getEcheancesByInscriptionController, rappelerEcheanceController };
