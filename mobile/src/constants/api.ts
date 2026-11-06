// constants/api.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const PORT = '3000';

// Priorité à la variable d'environnement (fichier .env, voir .env.example) :
//   EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api
// Sinon, on déduit l'adresse du PC depuis le serveur Expo (même machine que le backend).
function getBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (!__DEV__) {
    return 'https://api.imtech.info/api'; // prod plus tard
  }

  // hostUri = "192.168.x.x:8081" quand l'app tourne sur un appareil physique
  const hostIp = Constants.expoConfig?.hostUri?.split(':')[0];
  const isPhysicalDevice = hostIp && hostIp !== '127.0.0.1' && hostIp !== 'localhost';

  if (isPhysicalDevice) {
    return `http://${hostIp}:${PORT}/api`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${PORT}/api`; // émulateur Android
  }

  return `http://localhost:${PORT}/api`; // iOS sim + web
}

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 10000,
};

// Chemins de l'API (ajoutés à BASE_URL par apiRequest) ; les fonctions prennent un id
export const ENDPOINTS = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  CHANGE_PASSWORD: '/auth/change-password',
  PROFIL: '/auth/profil',
  SESSIONS: '/auth/sessions',
  LAST_LOGIN: '/auth/last-login',
  LOGOUT_ALL: '/auth/logout-all',

  FORMATIONS: '/formations',
  ETUDIANT_FORMATIONS: (id: number | string) => `/etudiants/${id}/formations`,
  SUPPORTS: '/supports',
  SUPPORTS_FORMATION: (id: number | string) => `/formations/${id}/supports`,
  COMMENTAIRES_FORMATION: (id: number | string) => `/formations/${id}/commentaires`,
  SUPPORT_DETAIL: (id: number | string) => `/supports/${id}`,
  COMMENTAIRES_SUPPORT: (id: number | string) => `/supports/${id}/commentaires`,
  AJOUT_COMMENTAIRE: '/commentaires',
  PAIEMENTS: '/paiements',
  ASSISTANCES: '/assistances',
  DASHBOARD_PAIEMENT: (idEtudiant: number | string) => `/etudiants/${idEtudiant}/dashboard-paiement`,
  UTILISATEUR: (id: number | string) => `/utilisateurs/${id}`,
  NOTIFICATIONS: '/notifications',
  MARK_NOTIFICATION_LU: (id: number | string) => `/notifications/${id}/lu`,

  REACTIONS_SUPPORT: (id: number | string) => `/supports/${id}/reactions`,

  // Commentaire de fin de formation (obligatoire pour l'attestation)
  FORMATEURS_A_COMMENTER: '/mes-formateurs-a-commenter',
  COMMENTER_FORMATEUR: (idInscription: number | string) => `/inscriptions/${idInscription}/commentaire-formateur`,

  // Mon dossier : pièces obligatoires de l'étudiant connecté (consulter, déposer, remplacer)
  MON_DOSSIER: '/mon-dossier',

  // Recherche globale (formations et supports de l'étudiant)
  RECHERCHE: '/recherche',

  // Vitrine publique (sans connexion)
  VITRINE: '/public/vitrine',
  FORMATIONS_PUBLIQUES: '/public/formations',
  FORMATEURS_PUBLICS: '/public/formateurs',
  INSCRIPTION_EN_LIGNE: '/public/inscriptions',
  // Étudiant connecté : autres formations, et inscription à une ou plusieurs
  FORMATIONS_DISPONIBLES: (idEtudiant: number | string) => `/etudiants/${idEtudiant}/formations-disponibles`,
  INSCRIPTIONS_ETUDIANT: (idEtudiant: number | string) => `/etudiants/${idEtudiant}/inscriptions`,
};