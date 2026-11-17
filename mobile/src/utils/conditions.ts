// utils/conditions.ts
//
// Accord aux Conditions d'utilisation / Politique de confidentialité (étudiants).
// Gardé sur le téléphone (AsyncStorage), par utilisateur et par version du texte :
// aucune colonne ajoutée en base. Il n'est pas effacé à la déconnexion.
//
// L'inscription en ligne (case à cocher) ne connaît pas encore l'id du compte créé : elle
// enregistre l'accord par e-mail. À la première connexion, cet accord est reconnu et recopié
// sous l'id : l'étudiant n'a pas à accepter une deuxième fois.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VERSION_CONDITIONS } from '@/constants/conditions';

function cle(idUtilisateur: number | string) {
  return `conditions_acceptees_${idUtilisateur}`;
}

function cleEmail(email: string) {
  return `conditions_acceptees_email_${email.trim().toLowerCase()}`;
}

/** L'utilisateur a-t-il accepté la version actuelle des conditions (par id, sinon à l'inscription) ? */
export async function conditionsAcceptees(
  idUtilisateur: number | string,
  email?: string | null
): Promise<boolean> {
  try {
    if ((await AsyncStorage.getItem(cle(idUtilisateur))) === VERSION_CONDITIONS) return true;
    if (email && (await AsyncStorage.getItem(cleEmail(email))) === VERSION_CONDITIONS) {
      await AsyncStorage.setItem(cle(idUtilisateur), VERSION_CONDITIONS);
      await AsyncStorage.removeItem(cleEmail(email));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Enregistre l'accord pour la version actuelle */
export async function accepterConditions(idUtilisateur: number | string): Promise<void> {
  await AsyncStorage.setItem(cle(idUtilisateur), VERSION_CONDITIONS);
}

/** Inscription en ligne : accord donné avant que le compte ait un id */
export async function accepterConditionsInscription(email: string): Promise<void> {
  try {
    await AsyncStorage.setItem(cleEmail(email), VERSION_CONDITIONS);
  } catch {
    // au pire, l'accord sera redemandé après la connexion
  }
}

/**
 * null tant que la lecture n'est pas finie, puis true / false.
 * Sans utilisateur : true (rien à demander).
 */
export function useConditionsAcceptees(
  idUtilisateur?: number | string | null,
  email?: string | null
): boolean | null {
  // Résultat de la lecture, avec l'utilisateur auquel il se rapporte
  const [lu, setLu] = useState<{ id: number | string; ok: boolean } | null>(null);
  const sansUtilisateur = idUtilisateur === undefined || idUtilisateur === null;

  useEffect(() => {
    if (sansUtilisateur) return;
    let annule = false;
    conditionsAcceptees(idUtilisateur, email).then((ok) => {
      if (!annule) setLu({ id: idUtilisateur, ok });
    });
    return () => {
      annule = true;
    };
  }, [idUtilisateur, email, sansUtilisateur]);

  if (sansUtilisateur) return true;
  return lu && lu.id === idUtilisateur ? lu.ok : null;
}
