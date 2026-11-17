import React from 'react';
import { Stack } from 'expo-router';

// Pile de navigation de l'onglet Documents :
// - index → onglet Documents (liste globale)
// - [id]  → fiche d'un support (fichier, commentaires, réactions)
// La liste (index) reste toujours sous le détail : ouvert depuis un autre onglet (Accueil, recherche),
// le retour revient à la liste de l'onglet, et l'onglet ne rouvre pas un détail seul.
export const unstable_settings = { anchor: 'index' };

export default function DocumentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAFCFE' },
      }}
    />
  );
}
