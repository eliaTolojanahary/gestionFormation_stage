// Recherche globale du tableau de bord web : un seul champ, résultats groupés par type,
// limités à ce que le rôle a le droit de voir (mêmes règles que les pages et les routes).
//   Super Admin : étudiants, formations, inscriptions, utilisateurs
//   Accueil     : étudiants, formations, inscriptions
//   Formateur   : ses formations, les étudiants inscrits à ses formations, ses supports
const rechercheModel = require('../models/rechercheModel');
const { ROLES } = require('../config/roles');
const { motifLike } = require('../utils/pagination');

const LONGUEUR_MIN = 2;
const PAR_GROUPE = 5;

async function rechercher(texte, user) {
  const q = String(texte || '').trim().slice(0, 100);
  const vide = { etudiants: [], formations: [], inscriptions: [], utilisateurs: [], supports: [] };
  if (q.length < LONGUEUR_MIN) return vide;

  const motif = motifLike(q);

  if (user.role === ROLES.FORMATEUR) {
    const [etudiants, formations, supports] = await Promise.all([
      rechercheModel.chercherEtudiants(motif, PAR_GROUPE, user.id),
      rechercheModel.chercherFormations(motif, PAR_GROUPE, user.id),
      rechercheModel.chercherSupports(motif, PAR_GROUPE, user.id),
    ]);
    return { ...vide, etudiants, formations, supports };
  }

  const [etudiants, formations, inscriptions, utilisateurs] = await Promise.all([
    rechercheModel.chercherEtudiants(motif, PAR_GROUPE),
    rechercheModel.chercherFormations(motif, PAR_GROUPE),
    rechercheModel.chercherInscriptions(motif, PAR_GROUPE),
    user.role === ROLES.SUPER_ADMIN ? rechercheModel.chercherUtilisateurs(motif, PAR_GROUPE) : [],
  ]);
  return { ...vide, etudiants, formations, inscriptions, utilisateurs };
}

module.exports = { rechercher, motifLike, LONGUEUR_MIN };
