// hooks/use-notification.ts
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { apiRequest } from '../utils/api';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** Notification reçue par l'utilisateur */
export interface Notification {
  id_notification: number;
  titre?: string;
  contenu?: string;
  message?: string;
  lu: boolean;
  type?: string;
  date_creation?: string;
  date_envoi?: string;
  id_utilisateur?: number;
  id_expediteur?: number;
  prenom_expediteur?: string;
  nom_expediteur?: string;
  [key: string]: any;   // tolérance pour d'autres champs backend
}

/** Payload pour envoyer une notification in-app */
export interface NotifInAppPayload {
  id_utilisateur?: number | number[];
  titre?: string;
  message: string;
  type?: string;
  [key: string]: any;
}

/** Payload pour envoyer un email */
export interface EmailPayload {
  destinataire: string | string[];
  sujet: string;
  message: string;
  [key: string]: any;
}

// ─────────────────────────────────────────────
// Compteur de la cloche (barre d'onglets)
// Rafraîchi au montage, toutes les minutes, au retour au premier plan, au changement
// d'onglet et dès qu'un écran lit / supprime une notification (rafraichirCloche).
// ─────────────────────────────────────────────
const abonnesCloche = new Set<() => void>();
let attenteCloche: ReturnType<typeof setTimeout> | undefined;

// Regroupe les appels rapprochés (« Tout marquer comme lu » = une lecture par notification)
export function rafraichirCloche() {
  clearTimeout(attenteCloche);
  attenteCloche = setTimeout(() => abonnesCloche.forEach((charger) => charger()), 300);
}

// Au-delà de 9 non lues, la cloche affiche « 9+ »
const MAX_BADGE = 9;
export function libelleBadge(nombre: number) {
  return nombre > MAX_BADGE ? `${MAX_BADGE}+` : String(nombre);
}

export function useNombreNonLues() {
  const [nombre, setNombre] = useState(0);

  useEffect(() => {
    let actif = true;
    async function charger() {
      try {
        const data = await apiRequest('/notifications', { method: 'GET' });
        const liste: Notification[] = data?.data ?? [];
        if (actif) setNombre(liste.filter((n) => !n.lu).length);
      } catch {
        // compteur inchangé (hors ligne, session expirée...)
      }
    }

    charger();
    abonnesCloche.add(charger);
    const intervalle = setInterval(charger, 60 * 1000);
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') charger();
    });
    return () => {
      actif = false;
      abonnesCloche.delete(charger);
      clearInterval(intervalle);
      abonnement.remove();
    };
  }, []);

  return nombre;
}

// ─────────────────────────────────────────────
// Hook
// Notifications de l'utilisateur connecté (chargées au montage), lecture et suppression.
// Les fonctions d'envoi appellent des routes réservées au personnel : un étudiant
// recevra une erreur 403 s'il les utilise.
// ─────────────────────────────────────────────
export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Récupérer toutes les notifications ───
  async function getNotifications(): Promise<Notification[]> {
    setIsLoading(true);
    setError('');

    try {
      const data = await apiRequest('/notifications', { method: 'GET' });
      const liste: Notification[] = data?.data ?? [];
      setNotifications(liste);
      return liste;
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les notifications.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Marquer une notification comme lue ───
  async function lireNotification(id: number | string) {
    const result = await apiRequest(`/notifications/${id}/lu`, {
      method: 'PUT',
    });

    setNotifications((current) =>
      current.map((n) =>
        n.id_notification === Number(id) ? { ...n, lu: true } : n
      )
    );

    rafraichirCloche();
    return result;
  }

  // ─── Supprimer une notification ───
  async function deleteNotification(id: number | string) {
    const result = await apiRequest(`/notifications/${id}`, {
      method: 'DELETE',
    });

    setNotifications((current) =>
      current.filter((n) => n.id_notification !== Number(id))
    );

    rafraichirCloche();
    return result;
  }

  // ─── Envoyer une notification in-app ───
  function envoyerNotifInApp(formData: NotifInAppPayload) {
    return apiRequest('/notifications/in-app', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  }

  // ─── Envoyer un email ───
  function envoyerEmail(formData: EmailPayload) {
    return apiRequest('/notifications/email', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  }

  // ─── Envoyer un email avec pièce jointe (FormData) ───
  function envoyerEmailPieceJointe(formData: FormData) {
    return apiRequest('/notifications/email/piece-jointe', {
      method: 'POST',
      body: formData,
      // ⚠️ Ne PAS mettre Content-Type : apiRequest doit le détecter
    });
  }

  // ─── Charger la liste au montage ───
  useEffect(() => {
    getNotifications();
     
  }, []);

  return {
    notifications,
    isLoading,
    error,
    getNotifications,
    lireNotification,
    deleteNotification,
    envoyerNotifInApp,
    envoyerEmail,
    envoyerEmailPieceJointe,
  };
}