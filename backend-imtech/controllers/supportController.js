// Controller des supports de cours (texte mis en forme et / ou fichier déposé par le formateur).
const supportService = require('../services/supportService');
const { exigerChamps } = require('../utils/errors');

// GET /formations/:id/supports
async function listerSupportsFormationController(req, res) {
  const supports = await supportService.listerSupportsFormation(req.params.id);
  res.json({ status: 'success', data: supports });
}

// GET /supports/:id
async function detailSupportController(req, res) {
  const support = await supportService.recupererSupport(req.params.id);
  res.json({ status: 'success', data: support });
}

// POST /supports (Formateur) : multipart avec id_formation, titre, contenu (texte mis en forme, HTML),
// fichier (PDF, image, audio, vidéo) — un texte ou un fichier au moins —
// et date_envoi_prevue (facultative : vide = envoi immédiat, sinon support programmé)
async function creerSupportController(req, res) {
  exigerChamps(req.body, ['id_formation']);
  const fichiers = req.files || (req.file ? [req.file] : []);

  const { ids, programme } = await supportService.creerSupports(
    {
      id_formation: req.body.id_formation,
      titre: req.body.titre,
      contenu: req.body.contenu,
      date_envoi_prevue: req.body.date_envoi_prevue,
      fichiers,
    },
    req.user
  );

  res.status(201).json({
    status: 'success',
    message: programme ? `${ids.length} support(s) programmé(s).` : `${ids.length} support(s) créé(s).`,
    ids,
  });
}

// GET /supports/programmes (Formateur : les siens ; Super Admin : tous)
async function listerSupportsProgrammesController(req, res) {
  const supports = await supportService.listerSupportsProgrammes(req.user);
  res.json({ status: 'success', data: supports });
}

// PUT /supports/:id (Formateur auteur ou Super Admin) : modifie un support programmé
// (titre, contenu, date_envoi_prevue et / ou nouveau fichier) tant qu'il n'est pas envoyé
async function modifierSupportProgrammeController(req, res) {
  const support = await supportService.modifierSupportProgramme(
    req.params.id,
    {
      titre: req.body.titre,
      contenu: req.body.contenu,
      date_envoi_prevue: req.body.date_envoi_prevue,
      fichier: req.file,
    },
    req.user
  );
  res.json({ status: 'success', message: 'Support programmé modifié.', data: support });
}

// POST /supports/:id/envoyer : envoie tout de suite un support programmé
async function envoyerSupportController(req, res) {
  await supportService.envoyerMaintenant(req.params.id, req.user);
  res.json({ status: 'success', message: 'Support envoyé.' });
}

// DELETE /supports/:id (Formateur ou Super Admin)
async function deleteSupportController(req, res) {
  await supportService.supprimerSupport(req.params.id, req.user);
  res.json({ status: 'success', message: 'Support supprimé.' });
}

module.exports = {
  listerSupportsFormationController,
  detailSupportController,
  creerSupportController,
  listerSupportsProgrammesController,
  modifierSupportProgrammeController,
  envoyerSupportController,
  deleteSupportController,
};
