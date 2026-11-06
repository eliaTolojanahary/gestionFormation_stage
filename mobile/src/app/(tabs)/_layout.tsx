import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, BookOpen, FileText, Bell, User } from 'lucide-react-native';
import { useSettings } from '@/context/SettingsContext';
import { libelleBadge, rafraichirCloche, useNombreNonLues } from '@/hooks/use-notification';

// Barre d'onglets du bas : Accueil, Formations, Documents, Notifications, Profil
export default function TabLayout() {
  // La barre suit l'apparence : accent = couleur principale choisie
  const { palette } = useSettings();
  const nbNonLues = useNombreNonLues();
  // Zone système du bas (barre de gestes / boutons Android, indicateur iPhone) : la barre
  // s'arrête au-dessus. Avec une hauteur fixe, cette marge mangeait la place des libellés.
  const { bottom } = useSafeAreaInsets();

  return (
    <Tabs
      // Changer d'onglet met aussi à jour le compteur de la cloche
      screenListeners={{ tabPress: rafraichirCloche }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.line,
          height: 62 + bottom,
          paddingBottom: bottom + 6,
          paddingTop: 6,
        },
        // Libellé toujours sous l'icône (sinon à côté en paysage / grand écran)
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        // « Notifications » reste lisible même avec une grande taille de texte du téléphone
        tabBarAllowFontScaling: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="formations"
        options={{
          title: 'Formations',
          tabBarIcon: ({ color }) => <BookOpen size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color }) => <FileText size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => (
            // Cloche avec le nombre de notifications non lues (« 9+ » au-delà de 9), rien si tout est lu
            <View style={styles.cloche}>
              <Bell size={22} color={color} />
              {nbNonLues > 0 && (
                <View style={[styles.badge, { backgroundColor: palette.danger, borderColor: palette.surface }]}>
                  <Text style={styles.badgeTexte}>{libelleBadge(nbNonLues)}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  cloche: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTexte: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
