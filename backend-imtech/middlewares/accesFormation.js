// middlewares/accesFormation.js
// Un étudiant n'accède au contenu d'une formation (supports, commentaires, réactions) que si son
// inscription est active ET validée par l'Accueil. Le personnel et les formateurs ne sont pas concernés.
// Même règle que pour les fichiers des supports (fichierMiddleware / etudiantPeutVoirSupport).
const fichierModel = require('../models/fichierModel');
const { ROLES } = require('../config/roles');
const { forbidden, notFound } = require('../utils/errors');

async function verifierInscriptionValidee(user, id_formation) {
  const inscription = await fichierModel.inscriptionEtudiantFormation(user.id_etudiant, id_formation);
  if (!inscription) throw forbidden("Vous n'êtes pas inscrit à cette formation.");
  if (!Number(inscription.valide)) {
    throw forbidden(
      "Votre inscription à cette formation n'est pas encore validée par l'Accueil. " +
      'Les supports de cours seront accessibles dès sa validation.'
    );
  }
}

// Route dont le paramètre :id est une formation (ex. GET /formations/:id/supports)
async function exigerAccesFormation(req, res, next) {
  if (req.user?.role === ROLES.ETUDIANT) await verifierInscriptionValidee(req.user, req.params.id);
  next();
}

// Route qui vise un support : :id dans l'URL, ou id_support dans le corps (POST /commentaires)
async function exigerAccesSupport(req, res, next) {
  if (req.user?.role === ROLES.ETUDIANT) {
    const id_support = req.params.id ?? req.body?.id_support;
    const id_formation = await fichierModel.formationDuSupport(id_support);
    if (!id_formation) throw notFound('Support introuvable.');
    await verifierInscriptionValidee(req.user, id_formation);
  }
  next();
}

module.exports = { exigerAccesFormation, exigerAccesSupport };
