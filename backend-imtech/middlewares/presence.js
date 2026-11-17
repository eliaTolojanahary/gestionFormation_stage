// Présence d'un étudiant : un jour où il a CONSULTÉ OU TRAVAILLÉ un cours de sa formation.
// Compte comme présence (réponse réussie seulement), uniquement des actions volontaires :
//   - un support ouvert (GET /supports/:id, ou son fichier : PDF, image, audio, vidéo) ;
//   - une réaction ou un commentaire sur un support.
// Ne compte PAS : les requêtes automatiques de l'application (notifications toutes les 10 s,
// vérification de la session chaque minute), les LISTES de supports (l'accueil du mobile charge
// les derniers supports dès l'ouverture : ce serait de nouveau « application ouverte = présent »),
// ni le profil, les paiements ou l'assistance.
// Une seule ligne par jour (table presence) ; utilisée par la note système (classementService)
// et le risque de décrochage (decrochageService).
const presenceModel = require('../models/presenceModel');
const { ROLES } = require('../config/roles');

// Sans attendre : une erreur d'écriture ne doit jamais bloquer ni faire échouer la requête
function marquerPresenceEtudiant(utilisateur) {
  if (utilisateur?.role !== ROLES.ETUDIANT) return;
  presenceModel.marquerPresence(utilisateur.id).catch((err) => {
    console.error('Présence non enregistrée :', err.message);
  });
}

// Middleware des routes de cours : l'étudiant est marqué présent une fois la réponse envoyée
// avec succès (un accès refusé ou un support introuvable ne compte pas)
function presenceSurCours(req, res, next) {
  res.on('finish', () => {
    if (res.statusCode < 400) marquerPresenceEtudiant(req.user);
  });
  next();
}

module.exports = { marquerPresenceEtudiant, presenceSurCours };
