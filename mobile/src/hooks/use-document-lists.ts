// hooks/use-documents-list.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormationEtudiant } from './use-formation';
import { useSupport, Support } from './use-support';
import { inscriptionValidee } from '@/utils/inscription';

// Délai avant d'envoyer la recherche au serveur (évite une requête à chaque lettre tapée)
const DELAI_RECHERCHE = 350;

// Onglet Documents : tous les supports des formations validées de l'étudiant (du plus récent au
// plus ancien), avec recherche et filtres par formation / formateur.
// Recherche, filtres et pagination sont faits par le serveur (GET /supports) : le téléphone ne
// reçoit que 5 supports à la fois (PAR_PAGE), et « Voir plus » demande la page suivante.
export function useDocumentsList(etudiantId?: number | null) {
  const { formations: mesFormations, getFormations, isLoading: loadingFormations, error: errFormations } = useFormationEtudiant();
  const { listerSupports } = useSupport();

  const [supports, setSupports] = useState<Support[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filtres
  const [recherche, setRecherche] = useState('');
  const [rechercheEnvoyee, setRechercheEnvoyee] = useState('');
  const [filtreFormation, setFiltreFormation] = useState<number | 'Toutes'>('Toutes');
  const [filtreFormateur, setFiltreFormateur] = useState<number | 'Tous'>('Tous');
  // Numéro de la dernière demande : une réponse arrivée trop tard (filtre changé entre-temps) est ignorée
  const demande = useRef(0);

  useEffect(() => {
    if (etudiantId) getFormations(etudiantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etudiantId]);

  useEffect(() => {
    const minuterie = setTimeout(() => setRechercheEnvoyee(recherche), DELAI_RECHERCHE);
    return () => clearTimeout(minuterie);
  }, [recherche]);

  // ─── Chargement d'une page ─────────────────
  // numero 1 : remplace la liste ; sinon la page est ajoutée à la suite
  async function charger(numero: number) {
    if (!etudiantId) return;
    const id = ++demande.current;
    setIsLoading(true);
    setError('');
    try {
      const resultat = await listerSupports(
        {
          recherche: rechercheEnvoyee,
          id_formation: filtreFormation === 'Toutes' ? undefined : filtreFormation,
          id_formateur: filtreFormateur === 'Tous' ? undefined : filtreFormateur,
        },
        numero
      );
      if (id !== demande.current) return;
      setSupports((actuels) => (numero === 1 ? resultat.elements : [...actuels, ...resultat.elements]));
      setTotal(resultat.total);
      setPage(numero);
    } catch (err: any) {
      if (id === demande.current) setError(err?.message || 'Impossible de charger les supports.');
    } finally {
      if (id === demande.current) setIsLoading(false);
    }
  }

  // Nouvelle recherche ou nouveau filtre : on repart de la première page
  useEffect(() => {
    charger(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etudiantId, rechercheEnvoyee, filtreFormation, filtreFormateur]);

  // "Tirer pour rafraîchir" (RefreshControl)
  async function refresh() {
    setRefreshing(true);
    await Promise.all([etudiantId ? getFormations(etudiantId) : null, charger(1)]);
    setRefreshing(false);
  }

  function voirPlus() {
    if (!isLoading && supports.length < total) charger(page + 1);
  }

  // ─── Options des filtres ───────────────────
  // Construites à partir des formations validées de l'étudiant (sans doublon)
  const validees = useMemo(() => mesFormations.filter(inscriptionValidee), [mesFormations]);

  const formationsDisponibles = useMemo(
    () => validees.map((f) => ({ id: f.id_formation, nom: f.nom })),
    [validees]
  );

  const formateursDisponibles = useMemo(() => {
    const map = new Map<number, string>();
    validees.forEach((f) => {
      const nom = `${f.prenom_formateur || ''} ${f.nom_formateur || ''}`.trim();
      if (f.id_formateur && nom) map.set(f.id_formateur, nom);
    });
    return Array.from(map.entries()).map(([id, nom]) => ({ id, nom }));
  }, [validees]);

  function resetFiltres() {
    setRecherche('');
    setFiltreFormation('Toutes');
    setFiltreFormateur('Tous');
  }

  const filtresActifs = filtreFormation !== 'Toutes' || filtreFormateur !== 'Tous' || rechercheEnvoyee.trim() !== '';

  return {
    // données
    supports,
    // total de la recherche en cours, et restant à charger (bouton « Voir plus »)
    total,
    restant: Math.max(0, total - supports.length),
    filtresActifs,
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
    voirPlus,
  };
}
