// utils/contenuRiche.js
// Texte mis en forme des supports (éditeur du formateur : gras, italique, titres, listes, liens...).
// Le navigateur envoie du HTML : on ne garde qu'une liste fermée de balises, sinon un formateur
// (ou un compte volé) pourrait injecter un <script> exécuté chez tous les étudiants (XSS).
// Le HTML stocké en base est donc toujours propre : web et mobile l'affichent tel quel.
const sanitizeHtml = require('sanitize-html');

// Taille maximale du HTML (après nettoyage) : largement suffisant pour un cours écrit
const TAILLE_MAX = 100 * 1000;

const OPTIONS = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  // Liens : web et e-mail uniquement (pas de "javascript:...")
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  // Les navigateurs produisent <b>, <i>, <div>... : ramenés aux balises autorisées
  transformTags: {
    b: 'strong',
    i: 'em',
    strike: 's',
    del: 's',
    div: 'p',
    h1: 'h2',
    h4: 'h3',
    // Un lien s'ouvre dans un nouvel onglet, sans donner la main à la page ouverte
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
  // Balises refusées : leur texte est gardé, sauf pour script / style (contenu supprimé)
  disallowedTagsMode: 'discard',
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
  exclusiveFilter: (frame) => frame.tag === 'a' && !frame.attribs.href,
};

// Texte sans balises (sert à savoir si le contenu est vide)
function texteBrut(html) {
  return sanitizeHtml(html || '', { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// HTML nettoyé, ou null si le contenu est absent / vide (ex. "<p><br></p>" laissé par l'éditeur)
function nettoyerContenu(html) {
  if (html === undefined || html === null) return null;
  const propre = sanitizeHtml(String(html), OPTIONS).trim();
  if (!texteBrut(propre)) return null;
  return propre;
}

module.exports = { nettoyerContenu, texteBrut, TAILLE_MAX };
