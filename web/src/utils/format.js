// Formatage des montants en ariary et des noms.

// Ex. 3160000.02 -> "3 160 000 Ar" (séparateur de milliers français, arrondi à l'unité)
export function formatMontant(montant) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(montant) || 0)} Ar`
}

// Nom pour les e-mails, comme sur les documents officiels : « andry », « rakotoarisoa » -> « Andry RAKOTOARISOA »
export function formatNomComplet(prenom = '', nom = '') {
  const prenomFormate = String(prenom)
    .trim()
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_, separateur, lettre) => separateur + lettre.toUpperCase())
  return [prenomFormate, String(nom).trim().toUpperCase()].filter(Boolean).join(' ')
}
