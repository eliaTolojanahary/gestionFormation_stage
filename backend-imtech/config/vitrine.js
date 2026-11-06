// Informations publiques d'IMTECH INFO affichées dans la vitrine de l'application mobile.
// Valeurs par défaut = vrais contacts d'IMTECH INFO ; le fichier .env peut les remplacer.
require('dotenv').config();

const CONTACTS = Object.freeze({
  siteWeb: process.env.IMTECH_SITE_WEB || 'https://www.imtechinfo.com/',
  facebook: process.env.IMTECH_FACEBOOK_URL || 'https://web.facebook.com/profile.php?id=61584566136680&locale=fr_FR',
  email: process.env.IMTECH_EMAIL || 'im.techinfo.mdg@gmail.com',
  // Numéro WhatsApp au format international, sans espace ni « + » (ex. 261340000000)
  whatsapp: process.env.IMTECH_WHATSAPP || '',
  telephone: process.env.IMTECH_TELEPHONE || '',
  adresse: process.env.IMTECH_ADRESSE || '',
});

const PRESENTATION = Object.freeze({
  slogan: process.env.IMTECH_SLOGAN || 'Formez-vous aux métiers du numérique',
  description: process.env.IMTECH_DESCRIPTION ||
    'Centre de formation en informatique : cours pratiques, formateurs disponibles et suivi de chaque étudiant.',
});

// Engagement affiché quand le formateur n'a pas encore rédigé le sien (formation.engagement_formateur)
const ENGAGEMENT_PAR_DEFAUT =
  'Le formateur répond à vos questions sur l’application et publie les supports de chaque séance.';

module.exports = { CONTACTS, PRESENTATION, ENGAGEMENT_PAR_DEFAUT };
