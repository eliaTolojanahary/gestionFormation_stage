// Controller des comptes utilisateurs (tous rôles confondus).
const userService = require('../services/userService');
const { exigerChamps } = require('../utils/errors');

// La photo peut arriver via upload.single('photo') ou upload.fields([{ name: 'photo' }])
function cheminPhoto(req) {
  const fichier = req.file || req.files?.photo?.[0];
  return fichier ? `utilisateurs/${fichier.filename}` : undefined;
}

// GET /utilisateurs (Super Admin)
async function getAllUsers(req, res) {
  const users = await userService.listerUtilisateurs();
  res.json({ status: 'success', data: users });
}

// GET /utilisateurs/:id
async function getUserById(req, res) {
  const user = await userService.recupererUtilisateur(req.params.id);
  res.json({ status: 'success', data: user });
}

// POST /utilisateurs (Super Admin) : multipart avec photo facultative
async function createUserController(req, res) {
  exigerChamps(req.body, ['nom', 'email', 'mot_de_passe', 'id_role']);
  const { nom, prenom, email, mot_de_passe, telephone, id_role } = req.body;

  const id = await userService.creerUtilisateur({
    nom, prenom, email, mot_de_passe, telephone, id_role,
    photo: cheminPhoto(req) ?? null,
  });

  res.status(201).json({ status: 'success', message: 'Utilisateur créé avec succès !', id });
}

// PUT /utilisateurs/:id : seuls les champs envoyés sont modifiés ; req.user est transmis
// au service pour vérifier qui a le droit de changer le rôle
async function updateUserController(req, res) {
  const { nom, prenom, email, telephone, id_role, mot_de_passe } = req.body;
  const photo = cheminPhoto(req);

  await userService.modifierUtilisateur(
    req.params.id,
    { nom, prenom, email, telephone, id_role, mot_de_passe, photo },
    req.user
  );

  // Le mot de passe n'est jamais renvoyé dans la réponse
  const data = { nom, prenom, email, telephone, id_role, ...(photo && { photo }) };
  res.json({ status: 'success', message: 'Utilisateur mis à jour !', data });
}

// DELETE /utilisateurs/:id (Super Admin)
async function deleteUserController(req, res) {
  await userService.supprimerUtilisateur(req.params.id);
  res.json({ status: 'success', message: 'Utilisateur supprimé.' });
}

module.exports = {
  getAllUsers, getUserById, createUserController, updateUserController, deleteUserController
};
