import React from 'react';
import { Stack } from 'expo-router';

// Pile de navigation de l'onglet Formations :
// - index   → liste des formations de l'étudiant
// - [id]    → détail d'une formation (supports, commentaires, réactions)
// Le Stack est imbriqué dans les Tabs : la barre d'onglets reste visible.
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
