// utils/alert.ts
import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

/**
 * Affiche une confirmation cross-platform.
 * - Sur mobile : Alert.alert
 * - Sur web : window.confirm (natif navigateur)
 *
 * @returns true si l'utilisateur confirme, false sinon
 */
export async function confirmer({
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  // ─── WEB ───
  if (Platform.OS === 'web') {
    const texte = message ? `${title}\n\n${message}` : title;
    const ok = window.confirm(texte);
    return ok;
  }

  // ─── MOBILE ───
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: cancelText,
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: confirmText,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/**
 * Affiche une alerte simple (info / erreur) cross-platform.
 * - Sur mobile : Alert.alert
 * - Sur web : window.alert
 */
export function alerte(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}