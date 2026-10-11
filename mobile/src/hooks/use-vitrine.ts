// hooks/use-vitrine.ts
// Vitrine publique (personne non inscrite) : formations, formateurs compétents, contacts,
// et inscription en ligne à une ou plusieurs formations (validée ensuite par l'Accueil).
import { useCallback, useState } from 'react';
import { apiRequest } from '../utils/api';
import { ENDPOINTS } from '../constants/api';

export interface FormationPublique {
  id_formation: number;
  nom: string;
  description?: string;
  engagement_formateur: string;
  image?: string | null; // couverture "formations/xxx.jpg" (publique)
  tarif: number;
  duree?: string;
  duree_jours: number;
  id_formateur: number;
  nom_formateur: string;
  prenom_formateur: string;
  nb_inscrits: number;
  avis_formateur: 'competent' | 'non_competent' | 'pas_assez_avis';
  taux_positif: number | null;
}

export interface FormateurCompetent {
  id_formateur: number;
  nom: string;
  prenom: string;
  taux_positif: number;
  total_reactions: number;
  formations: string[];
}

export interface Vitrine {
  // fond : image du bandeau choisie par le Super Admin (« vitrine/xxx.jpg »), null = image par défaut
  presentation: { slogan: string; description: string; fond?: string | null };
  contacts: { facebook: string; email: string; whatsapp: string; telephone: string; adresse: string };
  formations: FormationPublique[];
  formateurs_competents: FormateurCompetent[];
  modes_paiement: { id_mode_paiement: number; nom: string }[];
}

export interface DemandeInscription {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  mot_de_passe: string;
  formations: { id_formation: number; nombre_tranches: number }[];
  id_mode_paiement: number;
  reference_virement?: string;
}

export interface ResultatInscription {
  email: string;
  inscriptions: { id_inscription: number; id_formation: number; montant_premier_paiement: number }[];
  total_premier_paiement: number;
}

export function useVitrine() {
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const chargerVitrine = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const result = await apiRequest(ENDPOINTS.VITRINE);
      setVitrine(result.data);
    } catch (requestError: any) {
      setErreur(requestError.message || 'Impossible de charger les formations.');
    } finally {
      setChargement(false);
    }
  }, []);

  // Une inscription par formation choisie ; l'erreur (e-mail déjà utilisé...) est relancée
  async function inscrire(demande: DemandeInscription): Promise<ResultatInscription> {
    const result = await apiRequest(ENDPOINTS.INSCRIPTION_EN_LIGNE, {
      method: 'POST',
      body: JSON.stringify(demande),
    });
    return result.data;
  }

  return { vitrine, chargement, erreur, chargerVitrine, inscrire };
}
