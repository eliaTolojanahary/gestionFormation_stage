// hooks/use-commentaire-formateur.ts
// Commentaire de fin de formation : ouvert à partir de la veille de la fin, obligatoire pour
// recevoir l'attestation. Il est lu par l'Accueil et la direction, pas par le formateur.
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { ENDPOINTS } from '../constants/api';

export interface FormationACommenter {
  id_inscription: number;
  formation_nom: string;
  date_fin: string;
  formateur_prenom: string;
  formateur_nom: string;
}

export function useCommentaireFormateur() {
  const [aCommenter, setACommenter] = useState<FormationACommenter[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const chargerACommenter = useCallback(async () => {
    setErreur('');
    try {
      const result = await apiRequest(ENDPOINTS.FORMATEURS_A_COMMENTER);
      setACommenter(result.data || []);
    } catch (requestError: any) {
      setErreur(requestError.message || 'Impossible de charger vos formations.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    chargerACommenter();
  }, [chargerACommenter]);

  const envoyerCommentaire = useCallback(async (idInscription: number, commentaire: string) => {
    await apiRequest(ENDPOINTS.COMMENTER_FORMATEUR(idInscription), {
      method: 'POST',
      body: JSON.stringify({ commentaire }),
    });
    setACommenter((actuel) => actuel.filter((f) => f.id_inscription !== idInscription));
  }, []);

  return { aCommenter, chargement, erreur, chargerACommenter, envoyerCommentaire };
}
