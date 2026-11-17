import React from 'react';
import { Stack } from 'expo-router';

// Pile de navigation de l'onglet Formations :
// - index   → liste des formations de l'étudiant
// - [id]    → détail d'une formation (supports, commentaires, réactions)
// Le Stack est imbriqué dans les Tabs : la barre d'onglets reste visible.
// La liste (index) reste toujours sous le détail : ouvert depuis un autre onglet (Accueil, recherche),
// le retour revient à la liste de l'onglet, et l'onglet ne rouvre pas un détail seul.
export const unstable_settings = { anchor: 'index' };

export default function FormationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAFCFE' },
      }}
    />
  );
}
