// hooks/use-vitrine.ts
// Vitrine publique (personne non inscrite) : formations, formateurs compétents, contacts,
// et inscription en ligne à une ou plusieurs formations (validée ensuite par l'Accueil).
// Étudiant connecté (etudiantId) : mêmes écrans, mais seulement les formations où il n'est pas
// encore inscrit, et inscription sans créer de compte.
// Formations et formateurs arrivent par pages de 5 : la suite est demandée en faisant glisser.
import { useCallback, useRef, useState } from 'react';
import { apiRequest } from '../utils/api';
import { ajouterPieces, type PiecesLocales } from './use-dossier';
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
  contacts: { siteWeb?: string; facebook: string; email: string; whatsapp: string; telephone: string; adresse: string };
  formations: FormationPublique[]; // première page
  formateurs_competents: FormateurCompetent[]; // première page
  totaux: { formations: number; formateurs_competents: number };
  par_page: number;
  modes_paiement: { id_mode_paiement: number; nom: string }[];
}

/** Inscription d'un étudiant connecté : pas de compte à créer */
export interface DemandeInscriptionCompte {
  formations: { id_formation: number; nombre_tranches: number }[];
  id_mode_paiement: number;
  reference_virement?: string;
}

/** Une liste lue page par page (formations ou formateurs) */
interface ListePaginee<T> {
  elements: T[];
  total: number;
  page: number;
}

const LISTE_VIDE = { elements: [], total: 0, page: 1 };

export interface DemandeInscription {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  mot_de_passe: string;
  confirmation_mot_de_passe: string;
  formations: { id_formation: number; nombre_tranches: number }[];
  id_mode_paiement: number;
  reference_virement?: string;
}

export interface ResultatInscription {
  email?: string; // absent pour un étudiant déjà connecté
  inscriptions: { id_inscription: number; id_formation: number; montant_premier_paiement: number }[];
  total_premier_paiement: number;
}

export function useVitrine(etudiantId?: number | null) {
  const [vitrine, setVitrine] = useState<Vitrine | null>(null);
  const [formations, setFormations] = useState<ListePaginee<FormationPublique>>(LISTE_VIDE);
  const [formateurs, setFormateurs] = useState<ListePaginee<FormateurCompetent>>(LISTE_VIDE);
  const [chargement, setChargement] = useState(true);
  const [suiteEnCours, setSuiteEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  // Évite de demander deux fois la même page quand onEndReached se déclenche plusieurs fois
  const suiteDemandee = useRef(false);

  // Étudiant connecté : seulement les formations où il n'est pas encore inscrit
  const routeFormations = etudiantId ? ENDPOINTS.FORMATIONS_DISPONIBLES(etudiantId) : ENDPOINTS.FORMATIONS_PUBLIQUES;

  const chargerVitrine = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const result = await apiRequest(ENDPOINTS.VITRINE);
      const contenu: Vitrine = result.data;
      setVitrine(contenu);
      setFormateurs({ elements: contenu.formateurs_competents, total: contenu.totaux.formateurs_competents, page: 1 });
      if (etudiantId) {
        const page = await apiRequest(`${ENDPOINTS.FORMATIONS_DISPONIBLES(etudiantId)}?page=1`);
        setFormations({ elements: page.data || [], total: page.pagination?.total ?? 0, page: 1 });
      } else {
        setFormations({ elements: contenu.formations, total: contenu.totaux.formations, page: 1 });
      }
    } catch (requestError: any) {
      setErreur(requestError.message || 'Impossible de charger les formations.');
    } finally {
      setChargement(false);
    }
  }, [etudiantId]);

  // Page suivante d'une liste, ajoutée à la suite (rien si tout est déjà chargé)
  async function chargerSuite<T>(
    liste: ListePaginee<T>,
    route: string,
    appliquer: (suite: ListePaginee<T>) => void
  ) {
    if (suiteDemandee.current || liste.elements.length >= liste.total) return;
    suiteDemandee.current = true;
    setSuiteEnCours(true);
    try {
      const page = liste.page + 1;
      const result = await apiRequest(`${route}?page=${page}`);
      appliquer({ elements: [...liste.elements, ...(result.data || [])], total: result.pagination?.total ?? liste.total, page });
    } catch (requestError: any) {
      setErreur(requestError.message || 'Impossible de charger la suite.');
    } finally {
      suiteDemandee.current = false;
      setSuiteEnCours(false);
    }
  }

  const chargerPlusFormations = () => chargerSuite(formations, routeFormations, setFormations);
  const chargerPlusFormateurs = () => chargerSuite(formateurs, ENDPOINTS.FORMATEURS_PUBLICS, setFormateurs);

  // Une inscription par formation choisie ; l'erreur (e-mail déjà utilisé...) est relancée.
  // Pièces du dossier jointes tout de suite (facultatif) : envoi en multipart, sinon en JSON.
  async function inscrire(demande: DemandeInscription, pieces: PiecesLocales = {}): Promise<ResultatInscription> {
    let body: string | FormData = JSON.stringify(demande);
    if (Object.keys(pieces).length > 0) {
      const formData = new FormData();
      Object.entries(demande).forEach(([cle, valeur]) => {
        if (valeur === undefined) return;
        formData.append(cle, typeof valeur === 'object' ? JSON.stringify(valeur) : String(valeur));
      });
      await ajouterPieces(formData, pieces);
      body = formData;
    }
    const result = await apiRequest(ENDPOINTS.INSCRIPTION_EN_LIGNE, { method: 'POST', body });
    return result.data;
  }

  // Étudiant connecté : inscription à d'autres formations, sans créer de compte
  async function inscrireCompte(idEtudiant: number, demande: DemandeInscriptionCompte): Promise<ResultatInscription> {
    const result = await apiRequest(ENDPOINTS.INSCRIPTIONS_ETUDIANT(idEtudiant), {
      method: 'POST',
      body: JSON.stringify(demande),
    });
    return result.data;
  }

  return {
    vitrine,
    formations: formations.elements,
    totalFormations: formations.total,
    formateurs: formateurs.elements,
    totalFormateurs: formateurs.total,
    chargement,
    suiteEnCours,
    erreur,
    chargerVitrine,
    chargerPlusFormations,
    chargerPlusFormateurs,
    inscrire,
    inscrireCompte,
  };
}
