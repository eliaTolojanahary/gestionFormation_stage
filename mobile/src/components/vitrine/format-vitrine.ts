// components/vitrine/format-vitrine.ts
// Petits formats partagés par la vitrine et l'inscription en ligne.

export function formatAriary(montant: number): string {
  return `${Math.round(Number(montant) || 0).toLocaleString('fr-FR')} Ar`;
}

// Initiales d'un nom de formation pour la couverture, ex. « Développement web » → « DW »
export function initialesFormation(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase())
    .join('');
}

// Montant indicatif du premier paiement : le serveur calcule le montant exact (arrondis de l'échéancier)
export function premierPaiementEstime(tarif: number, nombreTranches: number): number {
  return Math.round((Number(tarif) || 0) / Math.max(nombreTranches, 1));
}
