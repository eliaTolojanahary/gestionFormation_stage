import React from 'react';
import { Stack } from 'expo-router';

// Pile de navigation de l'onglet Documents :
// - index → onglet Documents (liste globale)
// - [id]  → fiche d'un support (fichier, commentaires, réactions)
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
