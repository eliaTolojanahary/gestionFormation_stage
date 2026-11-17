// Controller du risque de décrochage (Accueil et Super Admin) : liste et relance des étudiants.
const decrochageService = require('../services/decrochageService');
const { lirePagination, reponsePaginee, texteRecherche } = require('../utils/pagination');

// GET /decrochage : étudiants à risque, les plus urgents d'abord (situation actuelle, sans période).
// ?page=2&limite=10 : une page + pagination + compteurs (sur toute la liste) ; sans ?page : tout.
// Avec ?page : ?recherche= (prénom, nom, formation) et ?niveau=a_contacter|a_surveiller
// (valeur inconnue : tous les niveaux).
async function listerController(req, res) {
  const pagination = lirePagination(req.query);
  if (!pagination) {
    const data = await decrochageService.listerEtudiantsARisque();
    return res.json({ status: 'success', data });
  }
  const { niveau } = req.query;
  const filtres = {
    recherche: texteRecherche(req.query.recherche),
    niveau: Object.values(decrochageService.NIVEAUX).includes(niveau) ? niveau : null,
  };
  res.json(reponsePaginee(await decrochageService.listerPageARisque(filtres, pagination), pagination));
}

// POST /inscriptions/:id/relancer : notification + e-mail à l'étudiant, au plus tous les 3 jours
async function relancerController(req, res) {
  const { emailEnvoye } = await decrochageService.relancer(req.params.id, req.user.id);
  res.json({
    status: 'success',
    emailEnvoye,
    message: emailEnvoye
      ? "Relance envoyée à l'étudiant (notification et e-mail)."
      : "Notification envoyée à l'étudiant, mais l'e-mail n'a pas pu partir.",
  });
}

module.exports = { listerController, relancerController };
