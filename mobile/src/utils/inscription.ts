// utils/inscription.ts
import { Alert } from 'react-native';

// Inscription validée par l'Accueil ? (valide absent = ancienne réponse de l'API : on laisse passer,
// le serveur refuse de toute façon l'accès aux supports d'une inscription non validée)
export function inscriptionValidee(formation: { valide?: boolean | number }): boolean {
  return formation.valide === undefined || Boolean(Number(formation.valide));
}

// Ouvre une formation seulement si l'inscription est validée ; sinon explique pourquoi c'est bloqué
export function ouvrirSiValidee(formation: { valide?: boolean | number }, ouvrir: () => void) {
  if (inscriptionValidee(formation)) {
    ouvrir();
    return;
  }
  Alert.alert(
    'Inscription en attente',
    "Votre inscription n'a pas encore été validée par l'Accueil. Vous pourrez accéder aux supports de cours dès sa validation."
  );
}
