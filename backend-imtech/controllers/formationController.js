// Controller des formations.
const formationService = require('../services/formationService');
const { exigerChamps } = require('../utils/errors');
const { lirePagination, texteRecherche, reponsePaginee, reponseListe } = require('../utils/pagination');

// GET /formations : la liste dépend du rôle (req.user transmis au service)
// Query : ?etat=, ?recherche= (nom, description, formateur) ; ?page=&limite= pour une liste paginée
async function listerFormations(req, res) {
  const pagination = lirePagination(req.query);
  const resultat = await formationService.listerFormations(
    req.user,
    { etat: req.query.etat, recherche: texteRecherche(req.query.recherche) },
    pagination
  );
  res.json(pagination ? reponsePaginee(resultat, pagination) : reponseListe(resultat));
}

// GET /formations/:id
async function detailFormation(req, res) {
  const formation = await formationService.recupererFormation(req.params.id);
  res.json({ status: 'success', data: formation });
}

// GET /formations/:id/etudiants : étudiants inscrits à la formation
// Query : ?recherche= (nom, e-mail, téléphone) ; ?page=&limite= pour une liste paginée
async function etudiantsFormation(req, res) {
  const pagination = lirePagination(req.query);
  const resultat = await formationService.recupererEtudiantsFormation(
    req.params.id, req.user, { recherche: texteRecherche(req.query.recherche) }, pagination
  );
  res.json(pagination ? reponsePaginee(resultat, pagination) : reponseListe(resultat));
}

// POST /formations (Super Admin) : id_utilisateur = formateur responsable
async function creerFormationController(req, res) {
  exigerChamps(req.body, ['nom', 'tarif', 'duree_jours', 'id_utilisateur']);
  const { nom, description, engagement_formateur, tarif, duree, duree_jours, id_utilisateur } = req.body;

  const id_formation = await formationService.creerFormation({ nom, description, engagement_formateur, tarif, duree, duree_jours, id_utilisateur });
  res.status(201).json({ status: 'success', message: 'Formation créée.', id_formation });
}

// PUT /formations/:id (Super Admin)
async function updateFormationController(req, res) {
  const { nom, description, engagement_formateur, tarif, duree, duree_jours, id_utilisateur } = req.body;
  await formationService.modifierFormation(req.params.id, { nom, description, engagement_formateur, tarif, duree, duree_jours, id_utilisateur });
  res.json({ status: 'success', message: 'Formation mise à jour.' });
}

// PUT /formations/:id/image (Super Admin) : multipart, champ "image" (couverture affichée dans la vitrine)
async function modifierImageController(req, res) {
  const image = await formationService.modifierImageFormation(req.params.id, req.file);
  res.json({ status: 'success', message: 'Image de la formation mise à jour.', image });
}

// DELETE /formations/:id (Super Admin) : suppression logique
async function deleteFormationController(req, res) {
  await formationService.supprimerFormation(req.params.id);
  res.json({ status: 'success', message: 'Formation désactivée.' });
}

module.exports = { listerFormations, detailFormation, etudiantsFormation, creerFormationController, updateFormationController, modifierImageController, deleteFormationController };
