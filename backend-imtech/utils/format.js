// Formatage des montants en ariary (PDF, e-mails, notifications).

// Ex. 3160000.02 -> "3 160 000 Ar" (arrondi à l'unité).
// Espace ordinaire comme séparateur : toLocaleString('fr-FR') met une espace fine insécable
// que les polices standard de PDFKit (Helvetica) ne savent pas afficher.
function formatMontant(montant) {
  const entier = Math.round(Number(montant) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${entier} Ar`;
}

module.exports = { formatMontant };
