// Middlewares d'authentification (JWT + session) et d'autorisation (rôles, propriétaire).
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const etudiantModel = require('../models/etudiantModel');
const presenceModel = require('../models/presenceModel');
const { ROLES } = require('../config/roles');
const { unauthorized, forbidden } = require('../utils/errors');

// Vérifie le JWT ET que la session correspondante est toujours active :
// un logout / "déconnecter les autres appareils" invalide réellement le token.
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  await authentifier(req, token);
  next();
}

// Variante pour les fichiers (PDF, images) : un <a href>, un <img> ou une WebView
// ne peuvent pas envoyer l'en-tête Authorization, le token est donc aussi accepté
// dans l'URL (?token=...). Réservé aux routes de fichiers.
async function verifyFileToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token || null;
  await authentifier(req, token);
  next();
}

// Logique commune : valide le token, vérifie la session en base, puis attache
// l'utilisateur à la requête (req.user, req.userId, req.token).
async function authentifier(req, token) {
  if (!token) {
    throw unauthorized('Accès refusé. Token manquant.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw unauthorized('Token invalide ou expiré.');
  }

  const session = await userModel.findActiveSession(token);
  if (!session) {
    throw unauthorized('Session expirée ou révoquée. Veuillez vous reconnecter.');
  }

  // Les anciens tokens ne contiennent pas id_etudiant : on le complète depuis la base
  if (decoded.role === ROLES.ETUDIANT && !decoded.id_etudiant) {
    decoded.id_etudiant = await etudiantModel.getIdEtudiantByUtilisateur(decoded.id);
  }

  // Présence automatique : un étudiant qui utilise l'application est présent ce jour-là.
  // Sans attendre : une erreur d'écriture ne doit pas bloquer la requête.
  if (decoded.role === ROLES.ETUDIANT) {
    presenceModel.marquerPresence(decoded.id).catch((err) => {
      console.error('Présence non enregistrée :', err.message);
    });
  }

  req.user = decoded;
  req.token = token;
  req.userId = decoded.id;
}

// Autorise la route uniquement aux rôles listés, ex. checkRole(ROLES.ACCUEIL, ROLES.SUPER_ADMIN).
// À placer après verifyToken.
function checkRole(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.user || !rolesAutorises.includes(req.user.role)) {
      throw forbidden('Accès refusé : rôle insuffisant pour cette action.');
    }
    next();
  };
}

// Un étudiant ne peut accéder qu'à SES données (/etudiants/:id/...).
// Les autres rôles passent : leurs droits sont déjà filtrés par checkRole.
function exigerEtudiantProprietaire(param = 'id') {
  return (req, res, next) => {
    if (req.user.role === ROLES.ETUDIANT) {
      const idEtudiant = Number(req.user.id_etudiant);
      if (!idEtudiant || idEtudiant !== Number(req.params[param])) {
        throw forbidden('Vous ne pouvez consulter que vos propres données.');
      }
    }
    next();
  };
}

// Un utilisateur ne peut agir que sur son propre compte, sauf le Super Admin.
function exigerSoiOuAdmin(param = 'id') {
  return (req, res, next) => {
    const estAdmin = req.user.role === ROLES.SUPER_ADMIN;
    if (!estAdmin && Number(req.params[param]) !== Number(req.user.id)) {
      throw forbidden('Accès limité à votre propre compte.');
    }
    next();
  };
}

module.exports = {
  verifyToken,
  verifyFileToken,
  checkRole,
  exigerEtudiantProprietaire,
  exigerSoiOuAdmin,
};
