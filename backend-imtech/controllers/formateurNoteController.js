// Controller des commentaires de fin de formation sur les formateurs et de leur classement.
const formateurNoteService = require('../services/formateurNoteService');
const { exigerChamps } = require('../utils/errors');
const { lirePagination, texteRecherche, reponsePaginee, reponseListe } = require('../utils/pagination');
const { lirePeriode } = require('../utils/periode');

// GET /mes-formateurs-a-commenter (étudiant)
async function listerACommenterController(req, res) {
  const data = await formateurNoteService.listerACommenter(req.user);
  res.json({ status: 'success', data });
}

// POST /inscriptions/:id/commentaire-formateur { commentaire } (étudiant)
async function commenterController(req, res) {
  exigerChamps(req.body, ['commentaire']);
  await formateurNoteService.commenter(req.params.id, req.body.commentaire, req.user);
  res.status(201).json({ status: 'success', message: 'Commentaire envoyé. Merci !' });
}

// GET /formateurs/commentaires?statut=a_noter|notes&recherche=&page=&limite=
async function listerCommentairesController(req, res) {
  const pagination = lirePagination(req.query);
  const filtres = { statut: req.query.statut, recherche: texteRecherche(req.query.recherche) };
  const resultat = await formateurNoteService.listerCommentaires(filtres, pagination);
  res.json(pagination ? reponsePaginee(resultat, pagination) : reponseListe(resultat));
}

// PUT /formateurs/commentaires/:id/note { note }
async function noterCommentaireController(req, res) {
  exigerChamps(req.body, ['note']);
  await formateurNoteService.noterCommentaire(req.params.id, req.body.note);
  res.json({ status: 'success', message: 'Note enregistrée.' });
}

// GET /formateurs/avis?debut=&fin= : classement sur 20 (réactions + commentaires notés)
async function classementFormateursController(req, res) {
  const data = await formateurNoteService.classementFormateurs(lirePeriode(req.query));
  res.json({ status: 'success', data });
}

module.exports = {
  listerACommenterController, commenterController, listerCommentairesController,
  noterCommentaireController, classementFormateursController,
};
