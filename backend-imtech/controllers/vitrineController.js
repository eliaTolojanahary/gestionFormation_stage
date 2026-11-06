// Controller de la vitrine publique (sans connexion) : présentation d'IMTECH INFO et inscription en ligne.
const vitrineService = require('../services/vitrineService');
const { CHAMPS_DOSSIER } = require('../config/dossier');
const { cheminsUploades, supprimerFichiersRecus } = require('../utils/fichiersUpload');
const { badRequest } = require('../utils/errors');
const { lirePagination, reponsePaginee } = require('../utils/pagination');

// En multipart (pièces jointes), `formations` arrive en texte JSON
function lireFormations(formations) {
  if (typeof formations !== 'string') return formations;
  try {
    return JSON.parse(formations);
  } catch {
    throw badRequest('Formations invalides.');
  }
}

// GET /public/vitrine : présentation, contacts, modes de paiement, et la première page des
// formations et des formateurs compétents avec leurs totaux
async function vitrineController(req, res) {
  const vitrine = await vitrineService.contenuVitrine();
  res.json({ status: 'success', data: vitrine });
}

// ?page=&limite= (par défaut : première page de PAR_PAGE_VITRINE)
function paginationVitrine(query) {
  return lirePagination({ page: 1, limite: vitrineService.PAR_PAGE_VITRINE, ...query });
}

// GET /public/formations?page=&limite= : suite des formations (les plus demandées d'abord)
async function formationsPubliquesController(req, res) {
  const pagination = paginationVitrine(req.query);
  res.json(reponsePaginee(await vitrineService.pageFormations({}, pagination), pagination));
}

// GET /public/formateurs?page=&limite= : suite des formateurs compétents (les mieux notés d'abord)
async function formateursPublicsController(req, res) {
  const pagination = paginationVitrine(req.query);
  res.json(reponsePaginee(await vitrineService.pageFormateurs(pagination), pagination));
}

// GET /etudiants/:id/formations-disponibles?page=&limite= : formations où l'étudiant connecté
// n'est pas encore inscrit (« Voir plus de formations » du mobile)
async function formationsDisponiblesController(req, res) {
  const pagination = paginationVitrine(req.query);
  const resultat = await vitrineService.pageFormations({ id_etudiant: Number(req.params.id) }, pagination);
  res.json(reponsePaginee(resultat, pagination));
}

// POST /etudiants/:id/inscriptions : l'étudiant connecté s'inscrit à d'autres formations
// { formations: [{ id_formation, nombre_tranches }], id_mode_paiement, reference_virement }
async function inscriptionCompteController(req, res) {
  const { id_mode_paiement, reference_virement } = req.body;
  const resultat = await vitrineService.inscriptionCompteExistant(Number(req.params.id), {
    formations: lireFormations(req.body.formations), id_mode_paiement, reference_virement,
  });
  res.status(201).json({
    status: 'success',
    message: 'Inscription envoyée : elle sera validée par l’accueil après vérification du paiement.',
    data: resultat,
  });
}

// POST /public/inscriptions : crée le compte et une inscription par formation choisie
// { nom, prenom, email, telephone, mot_de_passe, confirmation_mot_de_passe,
//   formations: [{ id_formation, nombre_tranches }], id_mode_paiement, reference_virement }
// Pièces du dossier facultatives ici (multipart : photo_1, photo_2, photocopie_cin, certificat_residence) :
// l'étudiant peut aussi les déposer plus tard depuis Mon dossier. Demande refusée : fichiers supprimés.
async function inscriptionEnLigneController(req, res) {
  const {
    nom, prenom, email, telephone, mot_de_passe, confirmation_mot_de_passe, id_mode_paiement, reference_virement,
  } = req.body;
  let resultat;
  try {
    resultat = await vitrineService.inscriptionEnLigne({
      nom, prenom, email, telephone, mot_de_passe, confirmation_mot_de_passe,
      formations: lireFormations(req.body.formations), id_mode_paiement, reference_virement,
      pieces: cheminsUploades(req.files, 'etudiants', CHAMPS_DOSSIER),
    });
  } catch (error) {
    await supprimerFichiersRecus(req.files);
    throw error;
  }
  res.status(201).json({
    status: 'success',
    message: 'Inscription envoyée : elle sera validée par l’accueil après vérification du paiement.',
    data: resultat,
  });
}

// PUT /vitrine/fond (Super Admin) : multipart, champ "image" ; renvoie le chemin "vitrine/xxx.jpg"
async function modifierFondController(req, res) {
  const fond = await vitrineService.modifierFondVitrine(req.file);
  res.json({ status: 'success', message: 'Fond de la vitrine mis à jour.', fond });
}

// DELETE /vitrine/fond (Super Admin) : retour à l'image par défaut
async function supprimerFondController(req, res) {
  await vitrineService.reinitialiserFondVitrine();
  res.json({ status: 'success', message: 'Fond par défaut rétabli.' });
}

// GET /public/logo : chemin du logo ("vitrine/xxx.png"), null = logo par défaut
async function logoController(req, res) {
  const logo = await vitrineService.lireLogo();
  res.json({ status: 'success', data: { logo } });
}

// PUT /parametres/logo (Super Admin) : multipart, champ "image" ; renvoie le chemin
async function modifierLogoController(req, res) {
  const logo = await vitrineService.modifierLogo(req.file);
  res.json({ status: 'success', message: 'Logo mis à jour.', logo });
}

// DELETE /parametres/logo (Super Admin) : retour au logo par défaut
async function supprimerLogoController(req, res) {
  await vitrineService.reinitialiserLogo();
  res.json({ status: 'success', message: 'Logo par défaut rétabli.' });
}

module.exports = {
  vitrineController, formationsPubliquesController, formateursPublicsController,
  formationsDisponiblesController, inscriptionCompteController,
  inscriptionEnLigneController, modifierFondController, supprimerFondController,
  logoController, modifierLogoController, supprimerLogoController,
};
