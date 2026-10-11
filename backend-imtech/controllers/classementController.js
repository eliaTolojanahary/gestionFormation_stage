// Controller du classement des étudiants et des notes d'attestation.
const classementService = require('../services/classementService');

// GET /formations/:id/classement : étudiants classés avec leur note système (paiement + présence)
async function classementFormationController(req, res) {
  const classement = await classementService.classementFormation(req.params.id, req.user);
  res.json({ status: 'success', data: classement });
}

// PUT /inscriptions/:id/note : note de présentation sur 10 ; null efface la note
async function definirNoteController(req, res) {
  const resultat = await classementService.definirNote(req.params.id, req.body.note_presentation, req.user);
  res.json({
    status: 'success',
    message: resultat.note_presentation === null ? 'Note de présentation effacée.' : 'Note enregistrée.',
    data: resultat,
  });
}

module.exports = { classementFormationController, definirNoteController };
