// hooks/useFormationEtudiant.ts
import { useState } from 'react';
import { apiRequest } from '../utils/api';
import { ENDPOINTS } from '../constants/api';

export interface Formation {
  id_formation: number;
  nom: string;
  description?: string;
  tarif?: number;
  duree?: string;
  duree_jours?: number;
  etat?: boolean;
  prenom_formateur?: string;
  nom_formateur?: string;
  progression?: number;
  nb_modules?: number;
  supports?: any[];
  id_etudiant?:number;
  // Champs renvoyés par /etudiants/:id/formations
  date_inscription?: string;
  // false tant que l'Accueil n'a pas validé l'inscription (ex. inscription en ligne)
  valide?: boolean | number;
}

// Formations de l'étudiant connecté et détail d'une formation
export function useFormationEtudiant() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [formationDetail, setFormationDetail] = useState<Formation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // id = id_etudiant ; renvoie les formations où il est inscrit
  async function getFormations(id: number | string): Promise<Formation[]> {
    if (!id) return [];

    setError('');
    setIsLoading(true);

    try {
      const data = await apiRequest(ENDPOINTS.ETUDIANT_FORMATIONS(id), {
        method: 'GET',
      });

      const liste = data.data || data.formations || [];
      setFormations(liste);
      return liste;
    } catch (requestError: any) {
      const msg = requestError.message || 'Impossible de charger vos formations.';
      setError(msg);
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  // id = id_formation
  async function getFormationById(id: number | string): Promise<Formation | null> {
    if (!id) return null;

    setError('');
    setIsLoading(true);

    try {
      const data = await apiRequest(`/formations/${id}`, {
        method: 'GET',
      });

      const f = data.data || data.formation || data;
      setFormationDetail(f);
      return f;
    } catch (requestError: any) {
      const msg = requestError.message || 'Impossible de charger la formation.';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    formations,
    formationDetail,
    isLoading,
    error,
    getFormations,
    getFormationById,
  };
}