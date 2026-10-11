// Noms des rôles tels qu'ils sont stockés dans la table `role`.
// Toujours passer par ces constantes : une faute de frappe sur un accent
// ('Etudiant' au lieu de 'Étudiant') bloquerait l'accès sans aucune erreur.
const ROLES = Object.freeze({
  SUPER_ADMIN: 'Super Admin',
  ACCUEIL: 'Accueil',
  FORMATEUR: 'Formateur',
  ETUDIANT: 'Étudiant',
});

// Personnel administratif (gestion des inscriptions, paiements, documents)
const STAFF = Object.freeze([ROLES.SUPER_ADMIN, ROLES.ACCUEIL]);

// Tous les rôles connus
const TOUS = Object.freeze(Object.values(ROLES));

module.exports = { ROLES, STAFF, TOUS };
