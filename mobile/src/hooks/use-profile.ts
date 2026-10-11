// hooks/use-profil.ts
import { useCallback, useState } from 'react';
import { apiRequest } from '../utils/api';

/** Profil utilisateur (champs renvoyés par /auth/profil et /utilisateurs/:id) */
export interface Profil {
  id?: number;
  id_utilisateur?: number;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  photo?: string | null;
  id_role?: number | string;
  role?: string;
  role_nom?: string;
  initiales?: string;
  /** Champs optionnels selon votre backend */
  date_creation?: string;
  derniere_connexion?: string;
}

/** Payload accepté par updateProfil */
export interface UpdateProfilPayload {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  id_role?: number | string;
  ancien_mot_de_passe?: string;
  mot_de_passe?: string;
  photo?: string | null;   // selon votre API : URL, base64, ou à envoyer en FormData
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
export function useProfil() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Chargement du profil ───
  // /auth/profil donne l'identité de base, complétée par la fiche complète /utilisateurs/:id
  const getProfil = useCallback(async (): Promise<Profil> => {
    setIsLoading(true);
    setError('');
    try {
      const data = await apiRequest('/auth/profil', { method: 'GET' });
      const profile: Profil = data?.user ?? data?.data ?? data;

      const userId = profile?.id_utilisateur ?? profile?.id;
      if (!userId) return profile;

      const userData = await apiRequest(`/utilisateurs/${userId}`, {
        method: 'GET',
      });
      const details: Profil = userData?.data ?? userData ?? {};

      return { ...profile, ...details };
    } catch (requestError: any) {
      setError(requestError?.message || 'Impossible de charger le profil.');
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Mise à jour du profil ───
  const updateProfil = useCallback(
    async (
      id: number | string,
      profile: UpdateProfilPayload | FormData
    ): Promise<Profil> => {
      setIsLoading(true);
      setError('');
      try {
        // Si c'est un FormData (upload photo), ne pas sérialiser
        const isFormData = profile instanceof FormData;

        const result = await apiRequest(`/utilisateurs/${id}`, {
          method: 'PUT',
          body: isFormData ? (profile as FormData) : JSON.stringify(profile),
          headers: isFormData ? {} : undefined,
          // ⚠️ Pour FormData, laisser fetch définir le Content-Type
        });

        return result?.data ?? result;
      } catch (requestError: any) {
        setError(requestError?.message || 'Impossible de modifier le profil.');
        throw requestError;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    getProfil,
    updateProfil,
    isLoading,
    error,
  };
}