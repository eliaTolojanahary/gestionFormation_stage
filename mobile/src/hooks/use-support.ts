// hooks/use-support.ts
import { useState } from 'react';
import { apiRequest } from '../utils/api';
import { ENDPOINTS } from '../constants/api';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface Support {
  id_support: number;
  titre: string;
  description?: string;
  type?: string;          // 'PDF' | 'VIDEO' | 'DOC' ...
  url?: string;
  fichier?: string | null; // pièce jointe : chemin relatif (supports/...) ; null = support texte seul
  contenu?: string | null; // texte mis en forme (HTML nettoyé par le serveur), voir TexteRiche
  date_ajout?: string;
  // Champs réellement renvoyés par GET /formations/:id/supports
  date_publication?: string;
  nom_formation?: string;
  prof_nom?: string;
  prof_prenom?: string;
  prof_photo?: string;
  id_formation?: number;
  id_utilisateur?: number;
  prenom_auteur?: string;
  nom_auteur?: string;
}

export interface Commentaire {
  id_commentaire: number;
  contenu: string;
  date_creation?: string;
  // Champ réellement renvoyé par GET /supports/:id/commentaires
  date_commentaire?: string;
  id_support: number;
  id_utilisateur?: number;
  id_utilisateur_auteur?: number;
  prenom?: string;
  nom?: string;
  photo?: string;
  mentions?: number[];
  // Fil de discussion : id_parent null = commentaire principal ;
  // l'API renvoie les commentaires principaux avec leurs réponses
  id_parent?: number | null;
  reponses?: Commentaire[];
  nb_reponses?: number;
  titre_support?: string; // support commenté (renvoyé par l'API)
}

/** Nombre d'éléments demandés au serveur à chaque « Voir plus » */
export const PAR_PAGE = 5;

/**
 * Une page lue au curseur (?limite=&avant=) : `suivant` = id à passer en `avant` pour la page
 * suivante (null : fin de la liste), `total` = nombre d'éléments de toute la liste.
 */
export interface Page<T> {
  elements: T[];
  suivant: number | null;
  total: number;
  totalEchanges?: number; // commentaires : principaux + réponses
}

/** Filtres de GET /supports (onglet Documents) */
export interface FiltresSupports {
  recherche?: string;
  id_formation?: number;
  id_formateur?: number;
}

function avecCurseur(chemin: string, avant: number | null, limite: number) {
  return `${chemin}?limite=${limite}${avant ? `&avant=${avant}` : ''}`;
}

function lirePage<T>(result: any): Page<T> {
  return {
    elements: result.data || [],
    suivant: result.curseur?.suivant ?? null,
    total: result.curseur?.total ?? (result.data || []).length,
    totalEchanges: result.total_echanges,
  };
}

const PAGE_VIDE = { elements: [], suivant: null, total: 0 };

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
// Supports de cours et commentaires : lecture, publication, suppression.
export function useSupport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Supports ───────────────────────────────

  async function getSupports(formationId: number | string): Promise<Support[]> {
    if (!formationId) return [];

    setError('');
    try {
      const result = await apiRequest(
        ENDPOINTS.SUPPORTS_FORMATION(formationId),
        { method: 'GET' }
      );
      return result.data || result.supports || [];
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de charger les supports.');
      return [];
    }
  }

  // Une page des supports d'une formation (du plus récent au plus ancien)
  async function pageSupports(
    formationId: number | string,
    avant: number | null = null,
    limite = PAR_PAGE
  ): Promise<Page<Support>> {
    setError('');
    try {
      return lirePage<Support>(await apiRequest(avecCurseur(ENDPOINTS.SUPPORTS_FORMATION(formationId), avant, limite)));
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de charger les supports.');
      return PAGE_VIDE;
    }
  }

  // Onglet Documents : supports de toutes les formations validées de l'étudiant,
  // filtrés et paginés par le serveur (GET /supports?page=&limite=&recherche=...)
  async function listerSupports(
    filtres: FiltresSupports,
    page: number,
    limite = PAR_PAGE
  ): Promise<{ elements: Support[]; total: number }> {
    const params = new URLSearchParams({ page: String(page), limite: String(limite) });
    if (filtres.recherche?.trim()) params.set('recherche', filtres.recherche.trim());
    if (filtres.id_formation) params.set('id_formation', String(filtres.id_formation));
    if (filtres.id_formateur) params.set('id_formateur', String(filtres.id_formateur));
    const result = await apiRequest(`${ENDPOINTS.SUPPORTS}?${params}`);
    return { elements: result.data || [], total: result.pagination?.total ?? 0 };
  }

  // ─── Détail d'un support (GET /supports/:id) ─
  async function getSupportById(supportId: number | string): Promise<Support | null> {
    if (!supportId) return null;

    setError('');
    try {
      const result = await apiRequest(ENDPOINTS.SUPPORT_DETAIL(supportId), {
        method: 'GET',
      });
      return result.data || result.support || null;
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de charger le support.');
      return null;
    }
  }

  async function uploadSupport(formData: FormData) {
    setIsLoading(true);
    setError('');
    try {
      return await apiRequest('/supports', {
        method: 'POST',
        body: formData,
        // ⚠️ NE PAS mettre Content-Type ici : fetch le définit tout seul
        //    avec le boundary multipart correct
        headers: {}, // laisse fetch gérer le Content-Type
      });
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de déposer le support.');
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteSupport(supportId: number | string) {
    setIsLoading(true);
    setError('');
    try {
      return await apiRequest(`/supports/${supportId}`, { method: 'DELETE' });
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de supprimer le support.');
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Commentaires d'un support (GET /supports/:id/commentaires) ─
  async function getCommentairesBySupport(
    supportId: number | string
  ): Promise<Commentaire[]> {
    if (!supportId) return [];

    setError('');
    try {
      const result = await apiRequest(
        ENDPOINTS.COMMENTAIRES_SUPPORT(supportId),
        { method: 'GET' }
      );
      return result.data || result.commentaires || [];
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de charger les commentaires.');
      return [];
    }
  }

  // Une page du fil d'un support : commentaires principaux, chacun avec ses réponses
  async function pageCommentairesSupport(
    supportId: number | string,
    avant: number | null = null,
    limite = PAR_PAGE
  ): Promise<Page<Commentaire>> {
    setError('');
    try {
      return lirePage<Commentaire>(await apiRequest(avecCurseur(ENDPOINTS.COMMENTAIRES_SUPPORT(supportId), avant, limite)));
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de charger les commentaires.');
      return PAGE_VIDE;
    }
  }

  // Une page des commentaires de tous les supports d'une formation (une seule requête)
  async function pageCommentairesFormation(
    formationId: number | string,
    avant: number | null = null,
    limite = PAR_PAGE
  ): Promise<Page<Commentaire>> {
    setError('');
    try {
      return lirePage<Commentaire>(await apiRequest(avecCurseur(ENDPOINTS.COMMENTAIRES_FORMATION(formationId), avant, limite)));
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de charger les commentaires.');
      return PAGE_VIDE;
    }
  }

  // Ancien nom conservé pour compatibilité
  async function getCommentaires(
    supportId: number | string
  ): Promise<Commentaire[]> {
    return getCommentairesBySupport(supportId);
  }

  // mentions = id_etudiant des étudiants mentionnés ; idParent = commentaire auquel on répond.
  // Un commentaire vide n'est pas envoyé.
  async function createCommentaire(
    supportId: number | string,
    contenu: string,
    mentions: number[] = [],
    idParent: number | null = null
  ) {
    if (!contenu.trim()) {
      setError('Le commentaire ne peut pas être vide.');
      return null;
    }

    setIsLoading(true);
    setError('');
    try {
      return await apiRequest(ENDPOINTS.AJOUT_COMMENTAIRE, {
        method: 'POST',
        body: JSON.stringify({
          id_support: supportId,
          id_parent: idParent,
          contenu: contenu.trim(),
          mentions,
        }),
      });
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de publier le commentaire.');
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteCommentaire(commentaireId: number | string) {
    setIsLoading(true);
    setError('');
    try {
      return await apiRequest(`/commentaires/${commentaireId}`, {
        method: 'DELETE',
      });
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de supprimer le commentaire.');
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    error,
    getSupports,
    pageSupports,
    listerSupports,
    getSupportById,
    uploadSupport,
    deleteSupport,
    getCommentaires,
    getCommentairesBySupport,
    pageCommentairesSupport,
    pageCommentairesFormation,
    createCommentaire,
    deleteCommentaire,
  };
}