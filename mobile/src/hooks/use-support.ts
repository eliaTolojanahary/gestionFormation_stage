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
}

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

  // ─── Commentaires ───────────────────────────
  // Tous les commentaires de tous les supports d'une formation (l'API n'a pas de route dédiée)
  async function getCommentairesByFormation(
  formationId: number | string
): Promise<Commentaire[]> {
  if (!formationId) return [];

  setError('');

  try {
    // 1. Récupère les supports de la formation
    const supports = await getSupports(formationId);
    if (supports.length === 0) return [];

    // 2. Charge les commentaires de chaque support en parallèle
    const listes = await Promise.all(
      supports.map((s) => getCommentairesBySupport(s.id_support))
    );

    // 3. Fusionne tout en conservant le support d'origine
    //    (l'API /supports/:id/commentaires ne renvoie pas id_support)
    const tous: Commentaire[] = [];
    listes.forEach((liste, index) => {
      const idSupport = supports[index]?.id_support;
      liste.forEach((c) => tous.push({ ...c, id_support: c.id_support || idSupport }));
    });

    // 4. Trie par date (plus récent d'abord)
    //    L'API renvoie date_commentaire (date_creation conservé par compatibilité)
    tous.sort((a, b) => {
      const da = new Date(a.date_commentaire || a.date_creation || 0).getTime();
      const db = new Date(b.date_commentaire || b.date_creation || 0).getTime();
      return db - da;
    });

    return tous;
  } catch (requestError: any) {
    setError(requestError.message || 'Impossible de charger les commentaires.');
    return [];
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
    getSupportById,
    uploadSupport,
    deleteSupport,
    getCommentaires,
    getCommentairesBySupport,
    createCommentaire,
    getCommentairesByFormation,
    deleteCommentaire,
  };
}