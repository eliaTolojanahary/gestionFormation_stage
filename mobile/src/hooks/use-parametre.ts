// hooks/use-parametre.ts
//
// Les préférences d'apparence vivent désormais dans <SettingsProvider>
// (voir context/SettingsContext.tsx) : changer un thème / une couleur
// depuis Paramètres met à jour toute l'application, pas seulement la page.
//
// Ce hook conserve la même API et n'ajoute que la partie « Sécurité »
// (mot de passe + sessions), propre au compte connecté.
import { useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useSettings } from '@/context/SettingsContext';

// Ré-exportés pour que la page Paramètres garde un seul point d'entrée
export {
  COULEURS,
  type Theme,
  type FontSize,
  type Density,
  type Settings,
} from '@/constants/theme';

// ─────────────────────────────────────────────
// Types (sessions / connexion)
// ─────────────────────────────────────────────
export interface Session {
  id_session: number;
  user_agent?: string;
  ip?: string;
  cree_le: string;
  actif: boolean;
  est_courante?: boolean;
}

export interface LastLogin {
  cree_le: string;
  user_agent?: string;
  ip?: string;
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────
export function useParametre() {
  const {
    settings,
    changeSetting,
    saved,
    isLoading,
    setLogo,
    resetSettings,
  } = useSettings();

  // Password
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Sessions / connexion
  const [sessions, setSessions] = useState<Session[]>([]);
  const [lastLogin, setLastLogin] = useState<LastLogin | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState('');
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // ─── Mot de passe ───
  async function changePassword(
    current: string,
    newPass: string
  ): Promise<void> {
    setPasswordError('');
    setPasswordMessage('');

    if (!current) {
      setPasswordError('Veuillez saisir votre mot de passe actuel.');
      return;
    }
    if (newPass.length < 8) {
      setPasswordError(
        'Le nouveau mot de passe doit contenir au moins 8 caractères.'
      );
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await apiRequest('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          ancien_mot_de_passe: current,
          nouveau_mot_de_passe: newPass,
        }),
      });
      setPasswordMessage('Mot de passe mis à jour avec succès.');
      setTimeout(() => setPasswordMessage(''), 2500);
    } catch (e: any) {
      const msg = e?.message || 'Une erreur est survenue.';
      setPasswordError(msg);
      throw new Error(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  // ─── Sessions ───
  async function chargerSessions() {
    setIsLoadingSessions(true);
    setSessionsError('');
    try {
      const [sessionsData, lastLoginData] = await Promise.all([
        apiRequest('/auth/sessions', { method: 'GET' }),
        apiRequest('/auth/last-login', { method: 'GET' }),
      ]);
      setSessions(sessionsData?.sessions ?? []);
      setLastLogin(lastLoginData?.lastLogin ?? null);
    } catch (e: any) {
      setSessionsError(e?.message || 'Impossible de charger les sessions.');
    } finally {
      setIsLoadingSessions(false);
    }
  }

  // ─── Déconnexion globale ───
  async function logoutAll() {
    setIsLoggingOutAll(true);
    setSessionsError('');
    try {
      await apiRequest('/auth/logout-all', { method: 'PUT' });
      await chargerSessions();
    } catch (e: any) {
      setSessionsError(e?.message || 'Impossible de déconnecter les sessions.');
    } finally {
      setIsLoggingOutAll(false);
    }
  }

  return {
    // préférences (fournies par le contexte global)
    settings,
    changeSetting,
    saved,
    isLoading,
    setLogo,
    resetSettings,

    // password
    changePassword,
    isUpdatingPassword,
    passwordMessage,
    passwordError,

    // sessions
    sessions,
    lastLogin,
    isLoadingSessions,
    sessionsError,
    isLoggingOutAll,
    chargerSessions,
    logoutAll,
  };
}