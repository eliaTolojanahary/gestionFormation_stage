// Controller des étudiants (compte utilisateur + dossier avec pièces justificatives).
const etudiantService = require('../services/etudiantService');
const { exigerChamps } = require('../utils/errors');
const { lirePagination, texteRecherche, reponsePaginee } = require('../utils/pagination');

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
// Query : ?recherche= (nom, e-mail, téléphone) ; ?page=&limite= pour une liste paginée
async function listerEtudiants(req, res) {
  const pagination = lirePagination(req.query);
  const resultat = await etudiantService.listerEtudiants({ recherche: texteRecherche(req.query.recherche) }, pagination);
  res.json(pagination ? reponsePaginee(resultat, pagination) : { status: 'success', data: resultat });
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

module.exports = { listerEtudiants, detailEtudiant, formationsEtudiant, creerEtudiantController, updateEtudiantController, deleteEtudiantController };
