import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Home, BookOpen, FileText, Bell, User } from 'lucide-react-native';
import { useSettings } from '@/context/SettingsContext';

// Barre d'onglets du bas : Accueil, Formations, Documents, Notifications, Profil
export default function TabLayout() {
  // La barre suit l'apparence : accent = couleur principale choisie
  const { palette } = useSettings();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.line,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
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
            // Cloche avec une pastille rouge (toujours affichée, indépendamment du nombre de non lues)
            <View style={{ position: 'relative' }}>
              <Bell size={22} color={color} />
              <View
                style={[styles.badgeDot, { backgroundColor: palette.danger }]}
              />
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
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E53935',
  },
});

