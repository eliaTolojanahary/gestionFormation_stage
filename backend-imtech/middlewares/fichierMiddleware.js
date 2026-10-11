// middlewares/fichierMiddleware.js
// Remplace express.static pour les fichiers uploadés : les URL restent les mêmes
// (/api/supports/xxx.pdf, /api/documents/xxx.pdf...), mais il faut être connecté,
// avoir le droit de voir ce fichier, et les documents sont servis avec un filigrane.
const fs = require('fs/promises');
const path = require('path');
const userModel = require('../models/userModel');
const fichierModel = require('../models/fichierModel');
const { verifyFileToken } = require('./authMiddleware');
const { filigraner } = require('../utils/filigrane');
const { ROLES, STAFF } = require('../config/roles');
const { forbidden } = require('../utils/errors');

const DOSSIER_UPLOADS = path.join(__dirname, '..', 'uploads');

// Documents officiels générés par IMTECH (remis à l'étudiant) : pas de filigrane au nom de l'Accueil
const DOCUMENTS_OFFICIELS = /^(fiche|facture|attestation)_/;

// Qui a le droit de voir quoi, par dossier
const REGLES = {
  // Photos de profil : visibles par tout utilisateur connecté (avatars des commentaires...)
  utilisateurs: {
    acces: async () => true,
    filigrane: false,
  },
  // Supports de cours : l'étudiant ne voit que ceux des formations où il est inscrit
  supports: {
    acces: async (user, chemin) =>
      user.role !== ROLES.ETUDIANT || fichierModel.etudiantPeutVoirSupport(chemin, user.id_etudiant),
    filigrane: true,
  },
  // Documents administratifs, fiches, factures, attestations : personnel et formateurs
  documents: {
    acces: async (user) => [...STAFF, ROLES.FORMATEUR].includes(user.role),
    filigrane: true,
  },
  // Pièces justificatives des étudiants : personnel administratif, ou l'étudiant lui-même
  etudiants: {
    acces: async (user, chemin) =>
      STAFF.includes(user.role) ||
      (user.role === ROLES.ETUDIANT && fichierModel.estPieceDeLEtudiant(chemin, user.id_etudiant)),
    filigrane: true,
  },
};

// Chemin absolu du fichier demandé, ou null s'il n'existe pas / sort du dossier
async function trouverFichier(dossier, urlPath) {
  let nom;
  try {
    nom = decodeURIComponent(urlPath).replace(/^\/+/, '');
  } catch {
    return null;
  }
  // Sécurité : on n'accepte qu'un simple nom de fichier, jamais un chemin ("../../.env")
  if (!nom || nom.includes('/') || nom.includes('\\')) return null;

  const absolu = path.join(DOSSIER_UPLOADS, dossier, nom);
  if (path.dirname(absolu) !== path.join(DOSSIER_UPLOADS, dossier)) return null;

  try {
    const stat = await fs.stat(absolu);
    return stat.isFile() ? absolu : null;
  } catch {
    return null;
  }
}

// Crée le middleware qui sert les fichiers de uploads/<dossier> selon REGLES[dossier] :
// authentification -> contrôle d'accès -> filigrane éventuel -> envoi.
function servirFichiers(dossier) {
  const regle = REGLES[dossier];

  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    // Pas un fichier existant : c'est une route de l'API (/api/supports/:id...), on la laisse passer
    const absolu = await trouverFichier(dossier, req.path);
    if (!absolu) return next();

    // Token accepté dans l'en-tête ou dans l'URL (?token=) ; lève une erreur 401 si absent/invalide
    await verifyFileToken(req, res, () => {});

    const nomFichier = path.basename(absolu);
    const chemin = `${dossier}/${nomFichier}`;
    if (!(await regle.acces(req.user, chemin))) {
      throw forbidden("Vous n'avez pas accès à ce fichier.");
    }

    // Jamais de copie dans le cache du navigateur ou d'un proxy
    res.set({
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    });

    if (regle.filigrane && !DOCUMENTS_OFFICIELS.test(nomFichier)) {
      const extension = path.extname(nomFichier).toLowerCase();
      try {
        const utilisateur = await userModel.findUserById(req.user.id);
        const contenu = await filigraner(await fs.readFile(absolu), extension, utilisateur || {});
        if (contenu) return res.type(extension).send(contenu);
      } catch (err) {
        // Fichier illisible pour pdf-lib / sharp (PDF corrompu...) : servi tel quel plutôt que bloqué
        console.error(`⚠️ Filigrane impossible pour ${chemin} :`, err.message);
      }
    }

    res.sendFile(absolu);
  };
}

module.exports = { servirFichiers };
