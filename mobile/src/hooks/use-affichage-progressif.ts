// hooks/use-affichage-progressif.ts
import { useState } from 'react';

/** Nombre d'éléments ajoutés à chaque appui sur « Voir plus » */
export const PAR_PAGE = 10;

/**
 * Affichage progressif d'une liste déjà chargée : les PAR_PAGE premiers éléments,
 * puis PAR_PAGE de plus à chaque `voirPlus()`.
 * `cle` (recherche, filtres...) : quand elle change, on revient aux PAR_PAGE premiers.
 */
export function useAffichageProgressif<T>(liste: T[], cle: string = '') {
  const [etat, setEtat] = useState({ cle, nombre: PAR_PAGE });
  const nombre = etat.cle === cle ? etat.nombre : PAR_PAGE;

  return {
    visibles: liste.slice(0, nombre),
    restant: Math.max(0, liste.length - nombre),
    voirPlus: () => setEtat({ cle, nombre: nombre + PAR_PAGE }),
  };
}
