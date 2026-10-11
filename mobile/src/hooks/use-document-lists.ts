// hooks/use-documents-list.ts
import { useEffect, useMemo, useState } from 'react';
import { useFormationEtudiant } from './use-formation';
import { useSupport, Support } from './use-support';

// Onglet Documents : tous les supports des formations de l'étudiant réunis dans une seule liste
// (du plus récent au plus ancien), avec recherche, filtres par formation / formateur et rafraîchissement.
export function useDocumentsList(etudiantId?: number | null) {
  const { formations, getFormations, isLoading: loadingFormations, error: errFormations } = useFormationEtudiant();
  const { getSupports } = useSupport();

  const [supports, setSupports] = useState<Support[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filtres
  const [recherche, setRecherche] = useState('');
  const [filtreFormation, setFiltreFormation] = useState<number | 'Toutes'>('Toutes');
  const [filtreFormateur, setFiltreFormateur] = useState<string | 'Tous'>('Tous');

  // ─── Chargement ────────────────────────────
  async function chargerTout() {
    if (!etudiantId) return;

    setIsLoading(true);
    setError('');

    try {
      const mesFormations = await getFormations(etudiantId);
      if (mesFormations.length === 0) {
        setSupports([]);
        return;
      }

      // Supports de chaque formation, chargés en parallèle
      const listes = await Promise.all(
        mesFormations.map((f) => getSupports(f.id_formation))
      );

      const tous: Support[] = [];
      listes.forEach((liste, index) => {
        const formation = mesFormations[index];
        liste.forEach((support) => {
          tous.push({
            ...support,
            id_formation: formation.id_formation,
            // on attache le contexte formation (utile pour filtres)
            // @ts-ignore : champs additionnels acceptés côté UI
            nom_formation: formation.nom,
            prof_prenom: formation.prenom_formateur,
            prof_nom: formation.nom_formateur,
          });
        });
      });

      // Trie par date (plus récent d'abord)
      tous.sort((a, b) => {
        const da = new Date(a.date_publication || a.date_ajout || 0).getTime();
        const db = new Date(b.date_publication || b.date_ajout || 0).getTime();
        return db - da;
      });

      setSupports(tous);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les supports.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    chargerTout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etudiantId]);

  // "Tirer pour rafraîchir" (RefreshControl)
  async function refresh() {
    setRefreshing(true);
    await chargerTout();
    setRefreshing(false);
  }

  // ─── Options des filtres ───────────────────
  // Construites à partir des supports chargés (sans doublon)
  const formationsDisponibles = useMemo(() => {
    const map = new Map<number, string>();
    supports.forEach((s: any) => {
      if (s.id_formation && s.nom_formation) {
        map.set(s.id_formation, s.nom_formation);
      }
    });
    return Array.from(map.entries()).map(([id, nom]) => ({ id, nom }));
  }, [supports]);

  const formateursDisponibles = useMemo(() => {
    const set = new Set<string>();
    supports.forEach((s: any) => {
      const nom = `${s.prenom_formateur || ''} ${s.nom_formateur || ''}`.trim();
      if (nom) set.add(nom);
    });
    return Array.from(set);
  }, [supports]);

  // ─── Filtrage ──────────────────────────────
  const supportsFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();

    return supports.filter((s: any) => {
      const formateur = `${s.prenom_formateur || ''} ${s.nom_formateur || ''}`.trim();

      // Formation
      if (filtreFormation !== 'Toutes' && s.id_formation !== filtreFormation) {
        return false;
      }

      // Formateur
      if (filtreFormateur !== 'Tous' && formateur !== filtreFormateur) {
        return false;
      }

      // Recherche
      if (q) {
        const cible = [
          s.titre,
          s.description,
          s.nom_formation,
          formateur,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!cible.includes(q)) return false;
      }

      return true;
    });
  }, [supports, recherche, filtreFormation, filtreFormateur]);

  function resetFiltres() {
    setRecherche('');
    setFiltreFormation('Toutes');
    setFiltreFormateur('Tous');
  }

  return {
    // données
    supports: supportsFiltres,
    totalSupports: supports.length,
    formations: formationsDisponibles,
    formateurs: formateursDisponibles,

    // états
    isLoading: isLoading || loadingFormations,
    error: error || errFormations,
    refreshing,

    // filtres
    recherche,
    setRecherche,
    filtreFormation,
    setFiltreFormation,
    filtreFormateur,
    setFiltreFormateur,
    resetFiltres,

    // actions
    refresh,
  };
}