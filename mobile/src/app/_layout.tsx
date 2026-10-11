// app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { StatusBar } from 'expo-status-bar';

// ─────────────────────────────────────────────
// Contenu de la pile : lit les tokens d'apparence
// (le fond et la barre de statut suivent le thème choisi dans Paramètres)
// ─────────────────────────────────────────────
function AppStack() {
  const { palette, isLoading } = useSettings();

  return (
    <>
      <StatusBar style={palette.name === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.pageBg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="decouvrir" />
        <Stack.Screen name="paiements" />
        <Stack.Screen name="assistance" />
        <Stack.Screen name="parametres" />
        <Stack.Screen name="lecteur" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

// Racine de l'application (expo-router) : fournit à tous les écrans les préférences d'affichage
// (SettingsProvider) et l'utilisateur connecté (AuthProvider)
export default function RootLayout() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <AppStack />
      </AuthProvider>
    </SettingsProvider>
  );
}