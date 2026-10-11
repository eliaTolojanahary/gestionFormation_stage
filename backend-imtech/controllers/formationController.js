// Controller des formations.
const formationService = require('../services/formationService');
const { exigerChamps } = require('../utils/errors');

// GET /formations : la liste dépend du rôle (req.user transmis au service)
async function listerFormations(req, res) {
  const formations = await formationService.listerFormations(req.user);
  res.json({ status: 'success', data: formations });
}

// GET /formations/:id
async function detailFormation(req, res) {
  const formation = await formationService.recupererFormation(req.params.id);
  res.json({ status: 'success', data: formation });
}

// GET /formations/:id/etudiants : étudiants inscrits à la formation
async function etudiantsFormation(req, res) {
  const etudiants = await formationService.recupererEtudiantsFormation(req.params.id, req.user);
  res.json({ status: 'success', data: etudiants });
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

// DELETE /formations/:id (Super Admin) : suppression logique
async function deleteFormationController(req, res) {
  await formationService.supprimerFormation(req.params.id);
  res.json({ status: 'success', message: 'Formation désactivée.' });
}

module.exports = { listerFormations, detailFormation, etudiantsFormation, creerFormationController, updateFormationController, deleteFormationController };
