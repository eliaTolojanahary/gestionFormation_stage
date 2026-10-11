// hooks/use-paiement.ts
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { apiRequest } from '../utils/api';
import { ENDPOINTS } from '../constants/api';
import { formatMontant } from '@/utils/format';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** Mode de paiement (aligné sur la table mode_paiement) */
export interface ModePaiement {
  id_mode_paiement: number;
  nom: string;
  code: 'mobile_money' | 'carte_bancaire' | 'virement' | 'especes';
}

/** Un paiement envoyé depuis l'app reste "en_attente" jusqu'à validation par l'accueil */
export type StatutPaiement = 'en_attente' | 'valide' | 'refuse';

/** Prochaine échéance à régler (sans paiement validé ni en attente) */
export interface ProchaineEcheance {
  id_echeance: number;
  id_inscription: number;
  id_formation: number;
  montant_prevu: number;
  date_echeance: string;
  formation_nom: string;
  en_retard: number | boolean;
}

export interface Paiement {
  id_paiement: number;
  id_echeance: number;
  id_inscription: number;
  id_formation: number;
  montant: number;
  date_paiement: string;
  reference_virement?: string | null;
  mode_paiement?: string | null;
  formation_nom: string;
  statut: StatutPaiement;
}

/** Résumé renvoyé par GET /etudiants/:id/dashboard-paiement */
export interface ResumePaiement {
  prochaine: ProchaineEcheance | null;
  dernier_paiement: Paiement | null;
  paiements_en_attente: Paiement[];
  total_du: number;
  total_paye: number;
  solde: number;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
// Résumé des paiements de l'étudiant (prochaine échéance, totaux, paiements en attente)
// et paiement de la prochaine échéance depuis l'app
export function usePaiement(etudiantId?: number | null) {
  const [resume, setResume] = useState<ResumePaiement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const getResumePaiement = useCallback(async (): Promise<ResumePaiement | null> => {
    if (!etudiantId) {
      setResume(null);
      return null;
    }

    setIsLoading(true);
    setError('');
    try {
      const result = await apiRequest(ENDPOINTS.DASHBOARD_PAIEMENT(etudiantId));
      const data: ResumePaiement = result.data;
      setResume(data);
      return data;
    } catch (requestError: any) {
      setError(requestError?.message || 'Impossible de charger les paiements.');
      setResume(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [etudiantId]);

  // Le montant est imposé par le serveur (montant prévu de l'échéance) :
  // on n'envoie que l'échéance et le mode de paiement.
  async function payerProchaineEcheance(mode: ModePaiement): Promise<boolean> {
    const prochaine = resume?.prochaine;
    if (!prochaine) {
      Alert.alert('Paiement', 'Aucune échéance à régler.');
      return false;
    }

    setIsLoading(true);
    setError('');
    try {
      await apiRequest(ENDPOINTS.PAIEMENTS, {
        method: 'POST',
        body: JSON.stringify({
          id_echeance: prochaine.id_echeance,
          id_mode_paiement: mode.id_mode_paiement,
          // Référence unique générée côté app : PAY-<échéance>-<horodatage>
          reference_virement: `PAY-${prochaine.id_echeance}-${Date.now()}`,
        }),
      });

      await getResumePaiement();

      Alert.alert(
        'Paiement envoyé',
        `Votre paiement de ${formatMontant(prochaine.montant_prevu)} via ${mode.nom} a bien été transmis. ` +
          "Il apparaîtra comme réglé dès que l'accueil l'aura validé.",
        [{ text: 'OK' }]
      );
      return true;
    } catch (e: any) {
      const msg = e?.message || 'Une erreur est survenue. Veuillez réessayer.';
      setError(msg);
      Alert.alert('Échec du paiement', msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  // Chargement automatique dès qu'un etudiantId est disponible
  useEffect(() => {
    getResumePaiement();
  }, [getResumePaiement]);

  return {
    resume,
    isLoading,
    error,
    getResumePaiement,
    payerProchaineEcheance,
  };
}
