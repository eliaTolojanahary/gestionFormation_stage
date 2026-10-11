// hooks/use-recherche.ts
import { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { ENDPOINTS } from '../constants/api';

export const LONGUEUR_MIN_RECHERCHE = 2;

export interface FormationTrouvee {
  id_formation: number;
  nom: string;
  duree?: string;
  /** false tant que l'Accueil n'a pas validé l'inscription */
  valide?: boolean | number;
}

export interface SupportTrouve {
  id_support: number;
  id_formation: number;
  titre: string;
  fichier?: string | null;
  date_publication?: string;
  nom_formation?: string;
}

export interface ResultatsRecherche {
  formations: FormationTrouvee[];
  supports: SupportTrouve[];
}

const VIDE: ResultatsRecherche = { formations: [], supports: [] };

// Recherche dans les formations et les supports de l'étudiant (GET /recherche).
// La requête part 250 ms après la dernière frappe ; une réponse dépassée (texte changé
// entre-temps) est ignorée ; rien n'est demandé sous 2 caractères.
// Chaque réponse est gardée avec le texte cherché : « en cours » = la dernière réponse
// ne correspond pas encore au texte tapé.
export function useRecherche(texte: string, delai = 250) {
  const [reponse, setReponse] = useState<{ q: string; resultats: ResultatsRecherche; error: string }>({
    q: '',
    resultats: VIDE,
    error: '',
  });

  const q = texte.trim();
  const assezLong = q.length >= LONGUEUR_MIN_RECHERCHE;

  useEffect(() => {
    if (!assezLong) return undefined;

    let annule = false;
    const minuteur = setTimeout(async () => {
      try {
        const result = await apiRequest(`${ENDPOINTS.RECHERCHE}?q=${encodeURIComponent(q)}`);
        if (annule) return;
        setReponse({
          q,
          resultats: { formations: result.data?.formations || [], supports: result.data?.supports || [] },
          error: '',
        });
      } catch (requestError: any) {
        if (!annule) setReponse({ q, resultats: VIDE, error: requestError?.message || 'Recherche impossible.' });
      }
    }, delai);

    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
  }, [q, assezLong, delai]);

  const aJour = assezLong && reponse.q === q;
  return {
    resultats: aJour ? reponse.resultats : VIDE,
    isLoading: assezLong && !aJour,
    error: aJour ? reponse.error : '',
  };
}
