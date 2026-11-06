// utils/api.ts
// Appels à l'API backend et stockage de la session sur le téléphone (AsyncStorage).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// Copie en mémoire du token : getFileUrl() est synchrone et doit pouvoir l'ajouter aux URL de fichiers
let tokenEnMemoire: string | null = null;

export function getTokenEnMemoire(): string | null {
  return tokenEnMemoire;
}

// Lit le token stocké (et met à jour la copie en mémoire)
export async function readStoredToken(): Promise<string | null> {
  tokenEnMemoire = await AsyncStorage.getItem(TOKEN_KEY);
  return tokenEnMemoire;
}

export async function readStoredUser() {
  const stored = await AsyncStorage.getItem(USER_KEY);
  try {
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Enregistre token + utilisateur après la connexion (la session survit à la fermeture de l'app)
export async function storeSession(token: string | undefined, user: unknown) {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    tokenEnMemoire = token;
  }
  if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function storeUser(user: unknown) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Déconnexion locale : efface token et utilisateur
export async function clearSession() {
  tokenEnMemoire = null;
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

// Appelé quand le serveur répond 401 alors qu'on était connecté
// (token expiré, ou session révoquée depuis "Déconnecter les autres appareils").
let onSessionExpiree: (() => void) | null = null;
export function setOnSessionExpiree(callback: (() => void) | null) {
  onSessionExpiree = callback;
}

// Appel à l'API utilisé par tous les hooks, ex. apiRequest('/paiements', { method: 'POST', body }).
// Ajoute le token, renvoie le JSON, lève une Error avec le message du serveur en cas d'échec.
export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = await readStoredToken();

  // Pour un FormData (upload), on laisse fetch poser lui-même
  // 'Content-Type: multipart/form-data; boundary=...'
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  let response: Response;
  try {
    response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    // Serveur injoignable ou pas de réseau : fetch lève « Network request failed » (en anglais)
    throw new Error(MESSAGE_HORS_LIGNE);
  }

  // Le corps peut être vide ou ne pas être du JSON (page HTML d'erreur...) :
  // dans ce cas on ne l'affiche pas, on garde le message par défaut du code HTTP
  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  // Session refusée par le serveur : on nettoie et on prévient l'app (retour à la connexion)
  if (response.status === 401 && token) {
    await clearSession();
    onSessionExpiree?.();
  }

  if (!response.ok) {
    throw new Error(data?.message || messageErreurHttp(response.status));
  }
  return data;
}

export const MESSAGE_HORS_LIGNE = 'Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.';

// Message compréhensible quand le serveur ne donne pas d'explication (au lieu de « Erreur 500 »)
export function messageErreurHttp(status: number) {
  if (status === 401) return 'Votre session a expiré. Veuillez vous reconnecter.';
  if (status === 403) return "Vous n'avez pas le droit d'effectuer cette action.";
  if (status === 404) return "L'élément demandé est introuvable. Il a peut-être été supprimé.";
  if (status === 413) return 'Le fichier est trop volumineux.';
  if (status === 429) return 'Trop de tentatives. Patientez quelques minutes puis réessayez.';
  if (status >= 500) return 'Le serveur a rencontré un problème. Réessayez dans un instant.';
  return "L'opération n'a pas pu aboutir. Réessayez.";
}
