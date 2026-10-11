import React from 'react';
import { Stack } from 'expo-router';

// Pile de navigation de l'onglet Profil :
// - index → fiche du profil de l'étudiant connecté (infos + déconnexion)
// Le Stack est imbriqué dans les Tabs : la barre d'onglets reste visible.
export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAFCFE' },
      }}
    />
  );
}
