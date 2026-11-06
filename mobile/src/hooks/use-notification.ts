// hooks/use-notification.ts
import { useEffect, useRef, useState } from 'react';
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

/** Totaux renvoyés par le serveur (toutes / non lues) */
export interface CompteurNotifications {
  total: number;
  nonLues: number;
}

// Nombre de notifications chargées par page (bouton « Notifications précédentes »)
const LIMITE = 10;
// Fréquence de la recherche de nouvelles notifications et du compteur de la cloche
const INTERVALLE_NOUVELLES = 10 * 1000;

// ─────────────────────────────────────────────
// Compteur de la cloche (barre d'onglets)
// Rafraîchi au montage, toutes les 10 s, au retour au premier plan, au changement
// d'onglet et dès qu'un écran lit / supprime une notification (rafraichirCloche).
// Seul le nombre est demandé au serveur (GET /notifications/compteur), pas la liste.
// ─────────────────────────────────────────────
const abonnesCloche = new Set<() => void>();
let attenteCloche: ReturnType<typeof setTimeout> | undefined;

// Regroupe les appels rapprochés (plusieurs lectures de suite)
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
        const data = await apiRequest('/notifications/compteur', { method: 'GET' });
        if (actif) setNombre(data?.data?.nonLues ?? 0);
      } catch {
        // compteur inchangé (hors ligne, session expirée...)
      }
    }

    charger();
    abonnesCloche.add(charger);
    const intervalle = setInterval(() => {
      if (AppState.currentState === 'active') charger();
    }, INTERVALLE_NOUVELLES);
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
// Notifications de l'utilisateur connecté : les LIMITE plus récentes au montage, les
// précédentes à la demande, les nouvelles ajoutées en haut toutes les 10 s et au retour
// au premier plan. Lecture et suppression.
// Les fonctions d'envoi appellent des routes réservées au personnel : un étudiant
// recevra une erreur 403 s'il les utilise.
// ─────────────────────────────────────────────
export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [compteur, setCompteur] = useState<CompteurNotifications>({ total: 0, nonLues: 0 });
  const [encorePlus, setEncorePlus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlus, setIsLoadingPlus] = useState(false);
  const [error, setError] = useState('');

  // Liste courante lue par l'intervalle (sa fonction garderait sinon la liste du premier rendu)
  const listeRef = useRef<Notification[]>(notifications);
  listeRef.current = notifications;

  function lireListe(params: Record<string, number>) {
    const query = Object.entries(params).map(([cle, valeur]) => `${cle}=${valeur}`).join('&');
    return apiRequest(`/notifications?${query}`, { method: 'GET' });
  }

  function lireCompteur(data: any) {
    if (data?.meta) setCompteur({ total: data.meta.total, nonLues: data.meta.nonLues });
  }

  // ─── Première page : les LIMITE plus récentes ───
  async function getNotifications(): Promise<Notification[]> {
    setIsLoading(true);
    setError('');

    try {
      const data = await lireListe({ limite: LIMITE });
      const liste: Notification[] = data?.data ?? [];
      setNotifications(liste);
      setEncorePlus(Boolean(data?.meta?.encorePlus));
      lireCompteur(data);
      return liste;
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les notifications.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Page suivante : plus anciennes que la dernière affichée, ajoutées en bas ───
  async function chargerPlusAnciennes() {
    const derniere = listeRef.current[listeRef.current.length - 1];
    if (!derniere) return;
    setIsLoadingPlus(true);

    try {
      const data = await lireListe({ limite: LIMITE, avant: derniere.id_notification });
      const liste: Notification[] = data?.data ?? [];
      setNotifications((current) => [...current, ...liste]);
      setEncorePlus(Boolean(data?.meta?.encorePlus));
      lireCompteur(data);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les notifications précédentes.');
    } finally {
      setIsLoadingPlus(false);
    }
  }

  // ─── Nouvelles : plus récentes que la première affichée, ajoutées en haut ───
  // Silencieux en cas d'erreur (nouvel essai au prochain passage).
  async function chargerNouvelles() {
    const premiere = listeRef.current[0];
    if (!premiere) {
      await getNotifications();
      return;
    }

    try {
      const data = await lireListe({ apres: premiere.id_notification });
      const nouvelles: Notification[] = data?.data ?? [];
      if (nouvelles.length) {
        setNotifications((current) => {
          const dejaAffichees = new Set(current.map((n) => n.id_notification));
          return [...nouvelles.filter((n) => !dejaAffichees.has(n.id_notification)), ...current];
        });
      }
      lireCompteur(data);
    } catch {
      // ignoré
    }
  }

  // ─── Marquer une notification comme lue ───
  async function lireNotification(id: number | string) {
    const result = await apiRequest(`/notifications/${id}/lu`, {
      method: 'PUT',
    });

    const etaitNonLue = listeRef.current.some((n) => n.id_notification === Number(id) && !n.lu);
    setNotifications((current) =>
      current.map((n) =>
        n.id_notification === Number(id) ? { ...n, lu: true } : n
      )
    );
    if (etaitNonLue) {
      setCompteur((current) => ({ ...current, nonLues: Math.max(current.nonLues - 1, 0) }));
    }

    rafraichirCloche();
    return result;
  }

  // ─── Tout marquer comme lu, y compris les notifications pas encore chargées ───
  async function lireToutesNotifications() {
    const result = await apiRequest('/notifications/lu-tout', {
      method: 'PUT',
    });

    setNotifications((current) => current.map((n) => ({ ...n, lu: true })));
    setCompteur((current) => ({ ...current, nonLues: 0 }));

    rafraichirCloche();
    return result;
  }

  // ─── Supprimer une notification ───
  async function deleteNotification(id: number | string) {
    const result = await apiRequest(`/notifications/${id}`, {
      method: 'DELETE',
    });

    const supprimee = listeRef.current.find((n) => n.id_notification === Number(id));
    setNotifications((current) =>
      current.filter((n) => n.id_notification !== Number(id))
    );
    if (supprimee) {
      setCompteur((current) => ({
        total: Math.max(current.total - 1, 0),
        nonLues: supprimee.lu ? current.nonLues : Math.max(current.nonLues - 1, 0),
      }));
    }

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

  // ─── Charger la première page au montage ───
  useEffect(() => {
    getNotifications();
     
  }, []);

  // ─── Nouvelles notifications toutes les 10 s, et tout de suite au retour au premier plan ───
  useEffect(() => {
    const intervalle = setInterval(() => {
      if (AppState.currentState === 'active') chargerNouvelles();
    }, INTERVALLE_NOUVELLES);
    const abonnement = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') chargerNouvelles();
    });
    return () => {
      clearInterval(intervalle);
      abonnement.remove();
    };
  }, []);

  return {
    notifications,
    compteur,
    encorePlus,
    isLoading,
    isLoadingPlus,
    error,
    getNotifications,
    chargerPlusAnciennes,
    chargerNouvelles,
    lireNotification,
    lireToutesNotifications,
    deleteNotification,
    envoyerNotifInApp,
    envoyerEmail,
    envoyerEmailPieceJointe,
  };
}