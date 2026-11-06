// Controller des supports de cours (texte mis en forme et / ou fichier déposé par le formateur).
const supportService = require('../services/supportService');
const { exigerChamps } = require('../utils/errors');
const { lireEtat } = require('../utils/etat');
const { ROLES } = require('../config/roles');
const { TRIS_SUPPORT, EXTENSIONS_TYPE } = require('../models/supportModel');
const { lirePagination, lireCurseur, reponsePaginee, reponseCurseur, reponseListe, texteRecherche } = require('../utils/pagination');

// GET /formations/:id/supports, du plus récent au plus ancien.
// ?limite=5&avant=<id_support> : une page + { curseur } (mobile) ; sinon toute la liste.
async function listerSupportsFormationController(req, res) {
  // ?etat=inactif|tous (page Documents) : jamais pour un étudiant
  const etat = lireEtat(req.query, req.user.role !== ROLES.ETUDIANT);
  const curseur = lireCurseur(req.query);
  const resultat = await supportService.listerSupportsFormation(req.params.id, etat, curseur);
  if (!curseur) return res.json({ status: 'success', data: resultat });
  res.json(reponseCurseur(resultat, curseur, 'id_support'));
}

// GET /supports : supports visibles par l'utilisateur, toutes formations confondues.
// ?page=&limite= (sinon toute la liste), ?recherche=, ?id_formation=, ?id_formateur=,
// ?type=texte|pdf|image|audio|video, ?tri=recents|anciens|titre ; valeurs inconnues ignorées.
async function listerSupportsController(req, res) {
  const { type, tri } = req.query;
  const filtres = {
    recherche: texteRecherche(req.query.recherche),
    id_formation: Number.parseInt(req.query.id_formation, 10) || undefined,
    id_formateur: Number.parseInt(req.query.id_formateur, 10) || undefined,
    type: type === 'texte' || EXTENSIONS_TYPE[type] ? type : undefined,
    tri: TRIS_SUPPORT[tri] ? tri : 'recents',
  };
  const pagination = lirePagination(req.query);
  const resultat = await supportService.listerSupports(filtres, pagination, req.user);
  if (!pagination) return res.json(reponseListe(resultat.lignes));
  res.json(reponsePaginee(resultat, pagination));
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
  res.json({ status: 'success', message: 'Support désactivé.' });
}

module.exports = {
  listerSupportsFormationController,
  listerSupportsController,
  detailSupportController,
  creerSupportController,
  listerSupportsProgrammesController,
  modifierSupportProgrammeController,
  envoyerSupportController,
  deleteSupportController,
};
