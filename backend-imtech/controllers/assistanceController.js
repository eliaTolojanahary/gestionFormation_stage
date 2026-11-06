// Controller des demandes d'assistance (étudiant -> Accueil).
const assistanceService = require('../services/assistanceService');
const { exigerChamps } = require('../utils/errors');
const { STATUTS_ASSISTANCE } = require('../models/assistanceModel');
const { lirePagination, texteRecherche, reponsePaginee, reponseListe } = require('../utils/pagination');

// POST /assistances (Étudiant)
async function creerAssistanceController(req, res) {
  exigerChamps(req.body, ['objet', 'contenu']);
  const demande = await assistanceService.creerDemande(req.body, req.user);
  res.status(201).json({ status: 'success', message: 'Demande envoyée.', data: demande });
}

// GET /assistances?statut=... : l'étudiant ne voit que ses demandes
// Query : ?statut=En attente|Résolu, ?recherche= ; ?page=&limite= : une page + compteurs.en_attente
async function listerAssistancesController(req, res) {
  const pagination = lirePagination(req.query);
  const statut = Object.values(STATUTS_ASSISTANCE).includes(req.query.statut) ? req.query.statut : undefined;
  const resultat = await assistanceService.listerDemandes(
    req.user,
    { statut, recherche: texteRecherche(req.query.recherche) },
    pagination
  );
  res.json(pagination ? reponsePaginee(resultat, pagination) : reponseListe(resultat));
}

// PUT /assistances/:id/resoudre (personnel)
async function resoudreAssistanceController(req, res) {
  const demande = await assistanceService.resoudreDemande(req.params.id, req.user);
  res.json({ status: 'success', message: 'Demande résolue.', data: demande });
}

module.exports = { creerAssistanceController, listerAssistancesController, resoudreAssistanceController };
