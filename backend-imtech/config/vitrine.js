// Informations publiques d'IMTECH INFO affichées dans la vitrine de l'application mobile.
// À renseigner dans le fichier .env (les valeurs par défaut ne sont que des exemples).
require('dotenv').config();

const CONTACTS = Object.freeze({
  facebook: process.env.IMTECH_FACEBOOK_URL || 'https://www.facebook.com/',
  email: process.env.IMTECH_EMAIL || 'contact@imtech.info',
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
