// hooks/use-doc-detail.ts
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Formation, useFormationEtudiant } from './use-formation';
import { Commentaire, Page, Support, useSupport } from './use-support';
import { Reaction, TypeReaction, useReaction } from './use-reaction';

// Données et actions des écrans de détail, en deux modes :
//  - mode formation (formationId) : la formation, ses supports, commentaires et réactions ;
//  - mode support (supportId)     : un seul support avec ses commentaires et réactions.
// Supports et commentaires arrivent par pages de 5 (pagination du serveur) : « Voir plus »
// demande la page suivante avec le curseur `suivant`.
// Gère aussi la saisie / publication des commentaires et l'ouverture du fichier.
export function useDocDetail(
  formationId?: string,
  supportId?: string,
  etudiantId?: number | null
) {
  const router = useRouter();
  const {
    getFormationById,
    getFormations,
    error: erreurFormation,
  } = useFormationEtudiant();

  const {
    pageSupports,
    getSupportById,
    pageCommentairesFormation,
    pageCommentairesSupport,
    createCommentaire,
    error: erreurSupport,
  } = useSupport();

  const {
    getReactions,
    react,
    removeReaction,
    isLoading: reactionEnCours,
    error: erreurReaction,
  } = useReaction();

  // ─── State ────────────────────────────────
  const [formation, setFormation] = useState<Formation | null>(null);
  const [supports, setSupports] = useState<Support[]>([]);
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  // Curseurs (id à passer en `avant`, null = fin) et totaux de toute la liste
  const [suivantSupports, setSuivantSupports] = useState<number | null>(null);
  const [totalSupports, setTotalSupports] = useState(0);
  const [suivantCommentaires, setSuivantCommentaires] = useState<number | null>(null);
  const [totalCommentaires, setTotalCommentaires] = useState(0);
  const [totalEchanges, setTotalEchanges] = useState(0);
  const [suiteEnCours, setSuiteEnCours] = useState(false);
  const [estEnCours, setEstEnCours] = useState(false);
  const [dateInscription, setDateInscription] = useState<string | undefined>();

  const [chargement, setChargement] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erreur, setErreur] = useState('');

  // Support sur lequel le prochain commentaire sera publié
  const [cibleSupport, setCibleSupport] = useState<number | null>(null);
  const [brouillon, setBrouillon] = useState('');
  // Réponse en cours : commentaire principal visé + auteur affiché ; null = nouveau commentaire
  const [reponseA, setReponseA] = useState<{ id: number; auteur: string } | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurCommentaire, setErreurCommentaire] = useState('');

  // ─── Mode de chargement ────────────────────
  // "support" si supportId est fourni, sinon "formation"
  const modeSupport = !!supportId;

  // Formation effective : si on est en mode support et qu'on n'a pas
  // de formationId, on la déduit du support chargé.
  const [formationEffectiveId, setFormationEffectiveId] = useState<
    string | undefined
  >(formationId);

  useEffect(() => {
    setFormationEffectiveId(formationId);
  }, [formationId]);

  // Page de commentaires selon le mode (support ou formation)
  function pageCommentaires(avant: number | null): Promise<Page<Commentaire>> {
    if (supportId) return pageCommentairesSupport(supportId, avant);
    return pageCommentairesFormation(formationEffectiveId!, avant);
  }

  function appliquerCommentaires(page: Page<Commentaire>, ajouter: boolean) {
    setCommentaires((actuels) => (ajouter ? [...actuels, ...page.elements] : page.elements));
    setSuivantCommentaires(page.suivant);
    setTotalCommentaires(page.total);
    setTotalEchanges(page.totalEchanges ?? page.elements.length);
  }

  // Réactions des supports donnés, une requête par support de la page (5 au plus)
  async function chargerReactions(liste: Support[]) {
    const listes = await Promise.all(liste.map((s) => getReactions(s.id_support)));
    const parSupport: Record<string, Reaction[]> = {};
    liste.forEach((support, index) => {
      parSupport[String(support.id_support)] = listes[index] || [];
    });
    return parSupport;
  }

  // ─── Chargement de la première page ────────
  async function chargerDonnees() {
    // Rien à charger si on n'a ni formation ni support
    if (!formationEffectiveId && !supportId) {
      setChargement(false);
      return;
    }

    setChargement(true);
    setErreur('');

    try {
      // ─── Mode SUPPORT (supportId fourni) ───
      if (supportId) {
        const support = await getSupportById(supportId);
        if (!support) {
          throw new Error('Support introuvable.');
        }

        const [pageCom, listeReactions] = await Promise.all([
          pageCommentairesSupport(supportId),
          getReactions(support.id_support),
        ]);

        setSupports([support]);
        appliquerCommentaires(pageCom, false);
        setReactions({ [String(support.id_support)]: listeReactions || [] });
        setCibleSupport(support.id_support);

        // Récupération de la formation parente si possible
        const fid = formationEffectiveId || String(support.id_formation);
        if (fid) {
          setFormationEffectiveId(fid);
          try {
            const detail = await getFormationById(fid);
            setFormation(detail);
          } catch {
            // formation non critique en mode support
          }

          if (etudiantId) {
            try {
              const mesFormations = await getFormations(etudiantId);
              const inscription = mesFormations.find(
                (f) => String(f.id_formation) === String(fid)
              );
              const derniere = mesFormations[mesFormations.length - 1];
              setEstEnCours(String(derniere?.id_formation) === String(fid));
              setDateInscription(
                inscription?.date_inscription || detailDateInscription(mesFormations, fid)
              );
            } catch {
              // non critique
            }
          }
        }

        setChargement(false);
        return;
      }

      // ─── Mode FORMATION (formationId fourni) ───
      if (!formationEffectiveId) {
        setChargement(false);
        return;
      }

      const [detail, pageSup, mesFormations, pageCom] = await Promise.all([
        getFormationById(formationEffectiveId),
        pageSupports(formationEffectiveId),
        etudiantId
          ? getFormations(etudiantId)
          : Promise.resolve<Formation[]>([]),
        pageCommentairesFormation(formationEffectiveId),
      ]);
      const listeSupports = pageSup.elements;
      const parSupport = await chargerReactions(listeSupports);

      // La formation est considérée "en cours" si c'est la dernière de la liste de l'étudiant
      const derniere = mesFormations[mesFormations.length - 1];
      const inscription = mesFormations.find(
        (f) => String(f.id_formation) === String(formationEffectiveId)
      );

      setFormation(detail);
      setSupports(listeSupports);
      setSuivantSupports(pageSup.suivant);
      setTotalSupports(pageSup.total);
      appliquerCommentaires(pageCom, false);
      setReactions(parSupport);
      setEstEnCours(
        String(derniere?.id_formation) === String(formationEffectiveId)
      );
      setDateInscription(
        inscription?.date_inscription || detail?.date_inscription
      );
      setCibleSupport(
        (actuel) =>
          actuel ??
          (listeSupports.length > 0 ? listeSupports[0].id_support : null)
      );
    } catch (requestError: any) {
      setErreur(
        requestError?.message ||
          (supportId
            ? 'Impossible de charger ce support.'
            : 'Impossible de charger cette formation.')
      );
    } finally {
      setChargement(false);
    }
  }

  // petite aide pour le fallback date d'inscription
  function detailDateInscription(
    mesFormations: Formation[],
    fid: string
  ): string | undefined {
    const f = mesFormations.find(
      (x) => String(x.id_formation) === String(fid)
    );
    return f?.date_inscription;
  }

  useEffect(() => {
    chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationEffectiveId, supportId, etudiantId]);

  async function refresh() {
    setRefreshing(true);
    await chargerDonnees();
    setRefreshing(false);
  }

  // ─── Pages suivantes (« Voir plus ») ───────
  async function voirPlusSupports() {
    if (!formationEffectiveId || !suivantSupports || suiteEnCours) return;
    setSuiteEnCours(true);
    try {
      const page = await pageSupports(formationEffectiveId, suivantSupports);
      const parSupport = await chargerReactions(page.elements);
      setSupports((actuels) => [...actuels, ...page.elements]);
      setReactions((actuelles) => ({ ...actuelles, ...parSupport }));
      setSuivantSupports(page.suivant);
      setTotalSupports(page.total);
    } finally {
      setSuiteEnCours(false);
    }
  }

  async function voirPlusCommentaires() {
    if (!suivantCommentaires || suiteEnCours) return;
    setSuiteEnCours(true);
    try {
      appliquerCommentaires(await pageCommentaires(suivantCommentaires), true);
    } finally {
      setSuiteEnCours(false);
    }
  }

  // ─── Réactions ─────────────────────────────
  function reactionsDuSupport(supportId: number): Reaction[] {
    return reactions[String(supportId)] || [];
  }

  function compterReactions(supportId: number, nomType: string): number {
    return reactionsDuSupport(supportId).filter(
      (r) => r.type_reaction === nomType
    ).length;
  }

  function maReaction(supportId: number, userId?: number): Reaction | undefined {
    return reactionsDuSupport(supportId).find(
      (r) => Number(r.id_utilisateur) === Number(userId)
    );
  }

  // Toucher sa propre réaction la retire ; sinon elle est ajoutée ou remplacée
  async function basculerReaction(
    supportId: number,
    type: TypeReaction,
    userId?: number
  ) {
    try {
      const suivantes =
        maReaction(supportId, userId)?.type_reaction === type.nom
          ? await removeReaction(supportId)
          : await react(supportId, type.nom);

      setReactions((precedent) => ({
        ...precedent,
        [String(supportId)]: suivantes,
      }));
    } catch {
      // erreur exposée par useReaction
    }
  }

  // ─── Commentaires ──────────────────────────
  async function publierCommentaire() {
    const contenu = brouillon.trim();
    if (!contenu || !cibleSupport) return;

    setEnvoiEnCours(true);
    setErreurCommentaire('');
    try {
      await createCommentaire(cibleSupport, contenu, [], reponseA?.id ?? null);
      setBrouillon('');
      setReponseA(null);

      // Le nouveau commentaire est le plus récent : on recharge la première page
      appliquerCommentaires(await pageCommentaires(null), false);
    } catch (requestError: any) {
      setErreurCommentaire(
        requestError?.message || 'Impossible de publier le commentaire.'
      );
    } finally {
      setEnvoiEnCours(false);
    }
  }

  // "Répondre" : la réponse est rattachée au commentaire principal (un seul niveau, comme
  // sur les réseaux sociaux) ; répondre à une réponse pré-remplit "@Prénom Nom "
  function repondreA(commentaire: Commentaire) {
    if (commentaire.id_support) setCibleSupport(commentaire.id_support);
    const auteur = `${commentaire.prenom || ''} ${commentaire.nom || ''}`.trim();
    setReponseA({ id: commentaire.id_parent || commentaire.id_commentaire, auteur });
    setBrouillon(commentaire.id_parent && auteur ? `@${auteur} ` : '');
  }

  function annulerReponse() {
    setReponseA(null);
    setBrouillon('');
  }

  // ─── Fichiers ──────────────────────────────
  // Ouvre le support dans le lecteur sécurisé de l'app (plus de navigateur externe :
  // il permettait de télécharger le fichier et de le partager hors d'IMTECH).
  // Support texte seul : on ouvre sa page de détail, où le texte est affiché.
  function ouvrirFichier(support: Support) {
    if (!support.fichier) {
      router.push({
        pathname: '/(tabs)/documents/[id]',
        params: { id: String(support.id_support) },
      } as any);
      return;
    }
    router.push({
      pathname: '/lecteur',
      params: { chemin: support.fichier, titre: support.titre },
    });
  }

  // ─── Données dérivées ──────────────────────
  const supportsParId = useMemo(() => {
    const map: Record<number, Support> = {};
    supports.forEach((s) => {
      map[s.id_support] = s;
    });
    return map;
  }, [supports]);

  // Nombre d'échanges de tout le fil (commentaires principaux + réponses), donné par le serveur
  const nbEchanges = totalEchanges;
  // Éléments pas encore chargés (bouton « Voir plus »)
  const supportsRestants = suivantSupports ? Math.max(0, totalSupports - supports.length) : 0;
  const commentairesRestants = suivantCommentaires ? Math.max(0, totalCommentaires - commentaires.length) : 0;

  const formateur = `${formation?.prenom_formateur || ''} ${
    formation?.nom_formateur || ''
  }`.trim();

  const messageErreur =
    erreur || erreurFormation || erreurSupport || erreurReaction;

  return {
    // Données
    formation,
    supports,
    commentaires,
    nbEchanges,
    totalSupports,
    supportsRestants,
    commentairesRestants,
    reactions,
    supportsParId,
    formateur,
    estEnCours,
    dateInscription,

    // États
    chargement,
    refreshing,
    erreur: messageErreur,
    reactionEnCours,
    cibleSupport,
    brouillon,
    reponseA,
    envoiEnCours,
    erreurCommentaire,

    // Actions
    refresh,
    voirPlusSupports,
    voirPlusCommentaires,
    reactionsDuSupport,
    compterReactions,
    basculerReaction,
    publierCommentaire,
    repondreA,
    annulerReponse,
    ouvrirFichier,

    // Setters exposés
    setCibleSupport,
    setBrouillon,
  };
}