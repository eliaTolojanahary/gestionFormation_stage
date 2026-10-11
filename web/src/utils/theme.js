// Couleur principale en mode sombre : les couleurs proposées dans Paramètres sont foncées
// (lisibles sur fond clair), elles deviendraient illisibles sur fond sombre. Chacune a donc une
// version claire et vive pour le mode sombre ; une autre couleur est éclaircie par le CSS.
const ACCENT_SOMBRE = {
  '#063a5c': '#38bdf8', // Bleu IMTECH
  '#137c8b': '#2dd4bf', // Bleu azur
  '#2d8066': '#4ade80', // Vert formation
  '#8e3b54': '#f472b6', // Bordeaux
  '#e2a019': '#fbbf24', // Jaune
  '#546e7a': '#94a3b8', // Gris
  '#d32f2f': '#f87171', // Rouge
}

// Applique la couleur choisie : --accent-clair (mode clair) et --accent-sombre (mode sombre) ;
// index.css choisit --accent selon data-theme
export function appliquerCouleurPrincipale(root, couleur) {
  const cle = String(couleur || '').toLowerCase()
  root.style.removeProperty('--accent') // ancienne version : --accent posé en dur masquait le thème
  root.style.setProperty('--accent-clair', couleur)
  root.style.setProperty(
    '--accent-sombre',
    ACCENT_SOMBRE[cle] || `color-mix(in srgb, ${couleur} 45%, #ffffff)`
  )
}
