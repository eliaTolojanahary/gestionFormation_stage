// context/AuthContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth as useAuthHook } from '../hooks/use-auth';

// Utilisateur connecté, tel que renvoyé par POST /auth/login
export interface User {
  id: number;
  id_utilisateur?: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  photo?: string | null;
  id_role?: number;
  role?: string;
  role_nom?: string;
  /** Renseigné uniquement pour le rôle Étudiant */
  id_etudiant?: number | null;
  initiales?: string;
}

// Le contexte partage une seule instance du hook use-auth avec tous les écrans :
// tous voient le même utilisateur connecté
type AuthContextType = ReturnType<typeof useAuthHook>;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthHook();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// À utiliser dans les écrans : const { user, logout } = useAuth()
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}