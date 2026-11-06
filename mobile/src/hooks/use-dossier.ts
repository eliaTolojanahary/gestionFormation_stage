// hooks/use-dossier.ts
// Dossier de l'étudiant connecté (Mon dossier) : les 4 pièces obligatoires, déposées ou à déposer.
// Une inscription en ligne n'est validée par l'Accueil qu'avec un dossier complet.
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { ajouterFichier } from '../utils/upload';
import { ENDPOINTS } from '../constants/api';

export type ChampPiece = 'photo_1' | 'photo_2' | 'photocopie_cin' | 'certificat_residence';

export interface PieceDossier {
  champ: ChampPiece;
  libelle: string;
  fichier: string | null; // chemin sur le serveur (null = à déposer)
}

export interface Dossier {
  pieces: PieceDossier[];
  fournies: number;
  total: number;
  complet: boolean;
}

// Mêmes pièces que backend-imtech/config/dossier.js (pour l'inscription, avant d'avoir un compte)
export const PIECES_DOSSIER: { champ: ChampPiece; libelle: string }[] = [
  { champ: 'photo_1', libelle: "Photo d'identité n°1" },
  { champ: 'photo_2', libelle: "Photo d'identité n°2" },
  { champ: 'photocopie_cin', libelle: 'Photocopie de la CIN' },
  { champ: 'certificat_residence', libelle: 'Certificat de résidence' },
];

// Photos choisies sur le téléphone, pas encore envoyées : { photo_1: 'file:///...' }
export type PiecesLocales = Partial<Record<ChampPiece, string>>;

// FormData avec une entrée par pièce choisie (réutilisé par l'inscription en ligne)
export async function ajouterPieces(formData: FormData, pieces: PiecesLocales) {
  for (const [champ, uri] of Object.entries(pieces)) {
    if (uri) await ajouterFichier(formData, champ, uri);
  }
}

// chargerAuMontage = false : l'écran appelle lui-même chargerDossier (ex. à chaque retour sur l'accueil)
export function useDossier(chargerAuMontage = true) {
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const chargerDossier = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const result = await apiRequest(ENDPOINTS.MON_DOSSIER);
      setDossier(result.data);
    } catch (requestError: any) {
      setErreur(requestError.message || 'Impossible de charger votre dossier.');
    } finally {
      setChargement(false);
    }
  }, []);

  // Dépose ou remplace les pièces choisies ; l'Accueil est notifié. L'erreur est relancée.
  async function deposer(pieces: PiecesLocales): Promise<Dossier> {
    const formData = new FormData();
    await ajouterPieces(formData, pieces);
    const result = await apiRequest(ENDPOINTS.MON_DOSSIER, { method: 'PUT', body: formData });
    setDossier(result.data);
    return result.data;
  }

  useEffect(() => {
    if (chargerAuMontage) chargerDossier();
  }, [chargerDossier, chargerAuMontage]);

  return { dossier, chargement, erreur, chargerDossier, deposer };
}
