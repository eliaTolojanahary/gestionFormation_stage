// Controller de la vitrine publique (sans connexion) : présentation d'IMTECH INFO et inscription en ligne.
const vitrineService = require('../services/vitrineService');

// GET /public/vitrine : présentation, contacts, formations, formateurs compétents, modes de paiement
async function vitrineController(req, res) {
  const vitrine = await vitrineService.contenuVitrine();
  res.json({ status: 'success', data: vitrine });
}

// POST /public/inscriptions : crée le compte et une inscription par formation choisie
// { nom, prenom, email, telephone, mot_de_passe, formations: [{ id_formation, nombre_tranches }],
//   id_mode_paiement, reference_virement }
async function inscriptionEnLigneController(req, res) {
  const { nom, prenom, email, telephone, mot_de_passe, formations, id_mode_paiement, reference_virement } = req.body;
  const resultat = await vitrineService.inscriptionEnLigne({
    nom, prenom, email, telephone, mot_de_passe, formations, id_mode_paiement, reference_virement,
  });
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

module.exports = { vitrineController, inscriptionEnLigneController, modifierFondController, supprimerFondController };
