import React from 'react';
import { Stack } from 'expo-router';

// Pile de navigation de l'onglet Notifications :
// - index → liste de toutes les alertes et mises à jour
// Le Stack est imbriqué dans les Tabs : la barre d'onglets reste visible.
export default function NotificationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAFCFE' },
      }}
    />
  );
}
