// hooks/use-auth.ts
import { useState, useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { ENDPOINTS } from '../constants/api';
import {
  apiRequest, clearSession, readStoredToken, readStoredUser,
  setOnSessionExpiree, storeSession, storeUser,
} from '../utils/api';
import type { User } from '../context/AuthContext';

export { readStoredToken, readStoredUser };

// Rôles autorisés sur l'application mobile (noms normalisés) : étudiants et administrateurs.
// L'Accueil et les formateurs sont refusés à la connexion et passent par le web.
const ALLOWED_ROLES = ['super admin', 'etudiant', 'admin'];

// Met le nom du rôle sous une forme comparable : minuscules, sans accents ni tirets
// ex. "Étudiant" -> "etudiant", "Super_Admin" -> "super admin"
function normalizeRole(value: any): string {
  return (value ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]/g, ' ')
    .trim();
}

// L'utilisateur a-t-il le droit d'utiliser l'app mobile ?
export function isAllowedRole(user: any): boolean {
  if (!user) return false;

  // On se base UNIQUEMENT sur le nom du rôle renvoyé par le backend
  const rawRole =
    user.role ||
    user.role_nom ||
    user.nom_role ||
    user.role?.nom ||
    '';

  const roleName = normalizeRole(rawRole);

  return roleName !== '' && ALLOWED_ROLES.includes(roleName);
}
const clearStorage = clearSession;

// Hook d'authentification (partagé via AuthContext) : utilisateur connecté, connexion,
// déconnexion, mots de passe et sessions.
// isReady passe à true une fois la session stockée relue au démarrage.
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  // Évite plusieurs alertes quand plusieurs requêtes reçoivent 401 en même temps
  const sessionFermee = useRef(false);

  // Session expirée / révoquée côté serveur (ex. « Se déconnecter partout » depuis un autre
  // appareil) : on oublie l'utilisateur ET on repasse sur l'écran de connexion
  useEffect(() => {
    setOnSessionExpiree(() => {
      setUser(null);
      if (sessionFermee.current) return;
      sessionFermee.current = true;
      router.replace('/login');
      Alert.alert('Session fermée', 'Vous avez été déconnecté. Veuillez vous reconnecter.');
    });
    return () => setOnSessionExpiree(null);
  }, [router]);

  // Sans requête, l'appareil ne saurait pas que sa session a été révoquée : on vérifie
  // quand l'application revient au premier plan et toutes les minutes tant qu'on est connecté
  useEffect(() => {
    if (!user) return;
    sessionFermee.current = false;
    const verifierSession = () => {
      if (AppState.currentState === 'active') apiRequest(ENDPOINTS.PROFIL).catch(() => {});
    };
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') verifierSession();
    });
    const intervalle = setInterval(verifierSession, 60 * 1000);
    return () => {
      abonnement.remove();
      clearInterval(intervalle);
    };
  }, [user]);

  // Au démarrage : reprend l'utilisateur stocké s'il a un rôle autorisé, sinon nettoie
  useEffect(() => {
    (async () => {
      try {
        const storedUser = await readStoredUser();

        if (storedUser && isAllowedRole(storedUser)) {
          setUser(storedUser);
        } else if (storedUser) {
          await clearStorage();
        }
      } catch {
        await clearStorage();
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  // 🔑 LOGIN
  async function login(email: string, password: string, rememberMe: boolean = true) {
    setError('');
    setIsLoading(true);

    try {
      const data = await apiRequest(ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), mot_de_passe: password }),
      });

      // 🔒 Vérification du rôle AVANT tout enregistrement
      if (!isAllowedRole(data.user)) {
        throw new Error(
          "Accès réservé aux administrateurs et aux étudiants. Contactez le support IMTECH."
        );
      }

      await storeSession(data.token, data.user);

      setUser(data.user);
      return data.user;
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de contacter le serveur.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  // Désactive la session côté serveur (si possible) puis efface les données locales
  async function logout() {
    try {
      const token = await readStoredToken();
      if (token) {
        await apiRequest(ENDPOINTS.LOGOUT, { method: 'POST' });
      }
    } catch {
      // silencieux
    }
    await clearStorage();
    setUser(null);
  }

  async function forgotPassword(email: string) {
    setError('');
    try {
      return await apiRequest(ENDPOINTS.FORGOT_PASSWORD, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de demander la réinitialisation.');
      return null;
    }
  }

  async function resetPassword(token: string, nouveauMotDePasse: string) {
    setError('');
    try {
      return await apiRequest(ENDPOINTS.RESET_PASSWORD, {
        method: 'POST',
        body: JSON.stringify({ token, nouveau_mot_de_passe: nouveauMotDePasse }),
      });
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de réinitialiser le mot de passe.');
      return null;
    }
  }

  // Fusionne les infos modifiées (profil) dans l'utilisateur courant et les sauvegarde
  async function updateCurrentUser(updatedUser: any) {
    const nextUser = {
      ...user,
      ...updatedUser,
      id: updatedUser?.id || updatedUser?.id_utilisateur || user?.id,
      role: updatedUser?.role || updatedUser?.role_nom || user?.role,
    };

    if (!isAllowedRole(nextUser)) {
      await clearStorage();
      setUser(null);
      throw new Error('Rôle non autorisé. Déconnexion forcée.');
    }

    await storeUser(nextUser);
    setUser(nextUser);
    return nextUser;
  }

  async function changePassword(ancienMotDePasse: string, nouveauMotDePasse: string) {
    setError('');
    try {
      return await apiRequest(ENDPOINTS.CHANGE_PASSWORD, {
        method: 'PUT',
        body: JSON.stringify({
          ancien_mot_de_passe: ancienMotDePasse,
          nouveau_mot_de_passe: nouveauMotDePasse,
        }),
      });
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de modifier le mot de passe.');
      throw requestError;
    }
  }

  async function getSessions() {
    setError('');
    try {
      const data = await apiRequest(ENDPOINTS.SESSIONS, { method: 'GET' });
      return data.sessions || [];
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de récupérer les sessions.');
      throw requestError;
    }
  }

  async function getLastLogin() {
    setError('');
    try {
      const data = await apiRequest(ENDPOINTS.LAST_LOGIN, { method: 'GET' });
      return data.lastLogin || null;
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de récupérer la dernière connexion.');
      throw requestError;
    }
  }

  async function logoutAll() {
    setError('');
    try {
      return await apiRequest(ENDPOINTS.LOGOUT_ALL, { method: 'PUT' });
    } catch (requestError: any) {
      setError(requestError.message || 'Impossible de déconnecter les sessions.');
      throw requestError;
    }
  }

  // 🔍 Helpers dérivés (normalisés)
  const roleName = normalizeRole(user?.role || user?.role_nom);

  // Recharge le profil depuis le serveur (exposé mais utilisé nulle part pour l'instant)
  async function refreshUser() {
    try {
      const token = await readStoredToken();
      if (!token) return null;

      const response = await apiRequest(ENDPOINTS.PROFIL, {
        method: 'GET',
      });

      // Selon le format de votre backend
      const freshUser = response?.user ?? response?.data ?? response;

      if (!freshUser || !isAllowedRole(freshUser)) {
        await clearStorage();
        setUser(null);
        return null;
      }

      // Fusionne avec l'utilisateur actuel pour conserver id/role si absents
      const merged = {
        ...user,
        ...freshUser,
        id: freshUser.id || freshUser.id_utilisateur || user?.id,
        role: freshUser.role || freshUser.role_nom || user?.role,
      };

      await storeUser(merged);
      setUser(merged);
      return merged;
    } catch {
      // silencieux — on garde l'utilisateur actuel si le refresh échoue
      return null;
    }
  }

  return {
    refreshUser,
    user,
    isLoading,
    isReady,
    error,
    isAuthenticated: !!user,
    isAdmin: roleName === 'super admin' || roleName === 'admin',
    isEtudiant: roleName === 'etudiant',
    login,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    updateCurrentUser,
    logoutAll,
    getLastLogin,
    getSessions,
  };
}