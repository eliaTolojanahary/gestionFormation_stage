// hooks/use-reaction.ts
import { useState } from 'react';
import { apiRequest } from '../utils/api';
import { ENDPOINTS } from '../constants/api';


export interface Reaction {
  id_reaction?: number;
  id_utilisateur?: number;  // auteur de la réaction (comparé à user.id)
  date_reaction?: string;
  type_reaction?: string;   // nom du type renvoyé par l'API : 'like' | 'coeur' | 'utile' | 'dislike'
  icone?: string;           // emoji du type réaction (👍, ❤️, 💡)
  nom?: string;             // nom de l'auteur de la réaction
  prenom?: string;          // prénom de l'auteur de la réaction
  id_type_reaction?: number;
  libelle?: string;         // libellé du type (facultatif)
  count?: number;           // nombre total pour ce type
  utilisateurs?: number[];  // ids des utilisateurs ayant réagi
  a_reacti?: boolean;       // l'utilisateur connecté a-t-il réagi ?
}

// ─────────────────────────────────────────────
// Types de réaction disponibles (table type_reaction).
// L'API reçoit le NOM du type : les ids ne servent qu'à l'affichage (clé de liste).
// ─────────────────────────────────────────────
export interface TypeReaction {
  id: number;
  nom: string;      // valeur en base (type_reaction.nom)
  icone: string;    // emoji affiché
  label: string;    // libellé lisible
}

export const REACTION_TYPES: TypeReaction[] = [
  { id: 1, nom: 'like', icone: '👍', label: "J'aime" },
  { id: 2, nom: 'coeur', icone: '❤️', label: "J'adore" },
  { id: 3, nom: 'utile', icone: '💡', label: 'Utile' },
  { id: 4, nom: 'dislike', icone: '👎', label: "Je n'aime pas" },
];

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
// Réactions sur un support : chaque action renvoie la liste à jour des réactions.
export function useReaction() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Lire les réactions d'un support ────────
  async function getReactions(supportId: number | string): Promise<Reaction[]> {
    if (!supportId) return [];

    setError('');
    try {
      const result = await apiRequest(
        ENDPOINTS.REACTIONS_SUPPORT(supportId),
        { method: 'GET' }
      );
      return result.data || result.reactions || [];
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de charger les réactions.');
      return [];
    }
  }

  // ─── Ajouter / changer de réaction ──────────
  async function react(
    supportId: number | string,
    typeReaction: string
  ): Promise<Reaction[]> {
    if (!supportId || !typeReaction) return [];

    setIsLoading(true);
    setError('');
    try {
      await apiRequest(ENDPOINTS.REACTIONS_SUPPORT(supportId), {
        method: 'POST',
        body: JSON.stringify({ type_reaction: typeReaction }),
      });
      // On recharge la liste pour avoir les counts à jour
      return await getReactions(supportId);
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible d\'enregistrer la réaction.');
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Retirer sa réaction ────────────────────
  async function removeReaction(supportId: number | string): Promise<Reaction[]> {
    if (!supportId) return [];

    setIsLoading(true);
    setError('');
    try {
      await apiRequest(ENDPOINTS.REACTIONS_SUPPORT(supportId), {
        method: 'DELETE',
      });
      return await getReactions(supportId);
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de retirer la réaction.');
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    error,
    getReactions,
    react,
    removeReaction,
  };
}