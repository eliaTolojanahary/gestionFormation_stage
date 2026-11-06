// Controller des étudiants (compte utilisateur + dossier avec pièces justificatives).
const etudiantService = require('../services/etudiantService');
const { exigerChamps } = require('../utils/errors');
const { lirePagination, texteRecherche, reponsePaginee, reponseListe } = require('../utils/pagination');
const { lireEtat } = require('../utils/etat');
const { ROLES, STAFF } = require('../config/roles');
const { CHAMPS_DOSSIER } = require('../config/dossier');
const { cheminsUploades, supprimerFichiersRecus } = require('../utils/fichiersUpload');

// Transforme req.files (multer .fields) en { champ: 'dossier/nom-fichier' } à enregistrer en base.
// "photo" (photo de profil) va dans utilisateurs/, les pièces justificatives dans etudiants/
function cheminsFichiers(files) {
  return Object.fromEntries(
    Object.entries(files || {}).map(([field, fichiers]) => {
      const dossier = field === 'photo' ? 'utilisateurs' : 'etudiants';
      return [field, `${dossier}/${fichiers[0].filename}`];
    })
  );
}

// GET /etudiants
// Query : ?recherche= (nom, e-mail, téléphone) ; ?page=&limite= pour une liste paginée.
// Formateur : seulement les étudiants de ses formations.
async function listerEtudiants(req, res) {
  const pagination = lirePagination(req.query);
  const filtres = {
    recherche: texteRecherche(req.query.recherche),
    etat: lireEtat(req.query, STAFF.includes(req.user.role)),
  };
  if (req.user.role === ROLES.FORMATEUR) filtres.id_formateur = req.user.id;
  const resultat = await etudiantService.listerEtudiants(filtres, pagination);
  res.json(pagination ? reponsePaginee(resultat, pagination) : reponseListe(resultat));
}

// GET /etudiants/:id
async function detailEtudiant(req, res) {
  const etudiant = await etudiantService.recupererEtudiant(req.params.id);
  res.json({ status: 'success', data: etudiant });
}

// GET /etudiants/:id/formations : formations où l'étudiant est inscrit
async function formationsEtudiant(req, res) {
  const formations = await etudiantService.recupererFormationsEtudiant(req.params.id);
  res.json({ status: 'success', data: formations });
}

// POST /etudiants : crée le compte utilisateur (rôle Étudiant) et la fiche étudiant
async function creerEtudiantController(req, res) {
  exigerChamps(req.body, ['nom', 'prenom', 'email', 'mot_de_passe']);
  const { nom, prenom, email, mot_de_passe, telephone } = req.body;
  const fichiers = cheminsFichiers(req.files);

  const id_etudiant = await etudiantService.creerEtudiant({
    nom, prenom, email, mot_de_passe, telephone,
    photo: fichiers.photo,
    photo_1: fichiers.photo_1,
    photo_2: fichiers.photo_2,
    certificat_residence: fichiers.certificat_residence,
    photocopie_cin: fichiers.photocopie_cin,
  });

  res.status(201).json({ status: 'success', message: 'Étudiant créé.', id_etudiant });
}

// PUT /etudiants/:id : infos + nouveaux fichiers éventuels
async function updateEtudiantController(req, res) {
  const { nom, prenom, email, telephone } = req.body;
  const updateData = { nom, prenom, email, telephone, ...cheminsFichiers(req.files) };

  await etudiantService.modifierEtudiant(req.params.id, updateData);
  res.json({ status: 'success', data: updateData });
}

// DELETE /etudiants/:id : suppression logique (désactivation)
async function deleteEtudiantController(req, res) {
  await etudiantService.supprimerEtudiant(req.params.id);
  res.json({ status: 'success', message: 'Étudiant désactivé.' });
}

// GET /mon-dossier (Étudiant) : pièces du dossier de l'étudiant connecté
async function monDossier(req, res) {
  const dossier = await etudiantService.lireDossier(req.user.id_etudiant);
  res.json({ status: 'success', data: dossier });
}

// PUT /mon-dossier (Étudiant) : multipart, un fichier par pièce déposée ou remplacée
// (photo_1, photo_2, photocopie_cin, certificat_residence)
async function deposerPieces(req, res) {
  try {
    const dossier = await etudiantService.deposerPieces(
      req.user.id_etudiant,
      cheminsUploades(req.files, 'etudiants', CHAMPS_DOSSIER)
    );
    res.json({ status: 'success', message: dossier.complet ? 'Dossier complet.' : 'Pièces enregistrées.', data: dossier });
  } catch (error) {
    await supprimerFichiersRecus(req.files);
    throw error;
  }
}

module.exports = {
  listerEtudiants, detailEtudiant, formationsEtudiant, creerEtudiantController, updateEtudiantController,
  deleteEtudiantController, monDossier, deposerPieces,
};
