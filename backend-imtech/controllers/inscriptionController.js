// Controller des inscriptions d'étudiants aux formations.
const inscriptionService = require('../services/inscriptionService');
const { exigerChamps } = require('../utils/errors');
const { lirePagination, texteRecherche, reponsePaginee } = require('../utils/pagination');

// POST /inscriptions : crée l'inscription et son échéancier (nombre_tranches échéances)
async function creerInscriptionController(req, res) {
  exigerChamps(req.body, ['id_etudiant', 'id_formation', 'nombre_tranches', 'id_tranche']);
  const { id_etudiant, id_formation, nombre_tranches, id_tranche } = req.body;

  const id_inscription = await inscriptionService.creerInscription({ id_etudiant, id_formation, nombre_tranches, id_tranche });

  res.status(201).json({
    status: 'success',
    message: 'Inscription créée et échéancier généré automatiquement.',
    id_inscription,
  });
}

// POST /inscriptions/:id/valid : valide l'inscription en enregistrant le paiement de la
// première échéance (reference_virement facultative)
async function validerInscriptionController(req, res) {
  exigerChamps(req.body, ['id_mode_paiement']);
  const { id_mode_paiement, reference_virement } = req.body;

  const result = await inscriptionService.validerInscription(req.params.id, id_mode_paiement, reference_virement);
  res.json({ status: 'success', message: 'Inscription validée et premier paiement enregistré.', data: result });
}

// GET /inscriptions
// Query : ?recherche= (étudiant ou formation), ?valide=oui|non, ?origine=accueil|en_ligne ;
// ?page=&limite= pour une liste paginée (une autre valeur de filtre est ignorée)
async function listerInscriptions(req, res) {
  const pagination = lirePagination(req.query);
  const filtres = {
    recherche: texteRecherche(req.query.recherche),
    valide: { oui: true, non: false }[req.query.valide],
    origine: ['accueil', 'en_ligne'].includes(req.query.origine) ? req.query.origine : undefined,
  };
  const resultat = await inscriptionService.listerInscriptions(filtres, pagination);
  res.json(pagination ? reponsePaginee(resultat, pagination) : { status: 'success', data: resultat });
}

// GET /inscriptions/:id
async function detailInscription(req, res) {
  const inscription = await inscriptionService.recupererInscription(req.params.id);
  res.json({ status: 'success', data: inscription });
}

// DELETE /inscriptions/:id : suppression logique
async function deleteInscriptionController(req, res) {
  await inscriptionService.supprimerInscription(req.params.id);
  res.json({ status: 'success', message: 'Inscription désactivée.' });
}

module.exports = { creerInscriptionController, validerInscriptionController, deleteInscriptionController, detailInscription, listerInscriptions };
