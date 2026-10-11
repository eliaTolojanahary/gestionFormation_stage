// hooks/use-assistance.ts
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { ENDPOINTS } from '../constants/api';

export type StatutAssistance = 'En attente' | 'Résolu';

/** Demande d'assistance envoyée par l'étudiant, traitée par l'accueil depuis le web */
export interface DemandeAssistance {
  id_assistance: number;
  objet: string;
  contenu: string;
  statut: StatutAssistance;
  date_envoi: string;
  date_resolution: string | null;
}

// Demandes d'assistance de l'étudiant connecté : liste (chargée au montage) et envoi d'une nouvelle demande
export function useAssistance() {
  const [demandes, setDemandes] = useState<DemandeAssistance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const getDemandes = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await apiRequest(ENDPOINTS.ASSISTANCES);
      setDemandes(result.data || []);
    } catch (requestError: any) {
      setError(requestError?.message || 'Impossible de charger vos demandes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Envoie la demande (l'accueil est notifié par le serveur) et l'ajoute en tête de liste ;
  // renvoie true si l'envoi a réussi
  async function envoyerDemande(objet: string, contenu: string): Promise<boolean> {
    setIsSending(true);
    setError('');
    try {
      const result = await apiRequest(ENDPOINTS.ASSISTANCES, {
        method: 'POST',
        body: JSON.stringify({ objet: objet.trim(), contenu: contenu.trim() }),
      });
      setDemandes((liste) => [result.data, ...liste]);
      return true;
    } catch (requestError: any) {
      setError(requestError?.message || "Impossible d'envoyer la demande.");
      return false;
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    getDemandes();
  }, [getDemandes]);

  return { demandes, isLoading, isSending, error, getDemandes, envoyerDemande };
}
