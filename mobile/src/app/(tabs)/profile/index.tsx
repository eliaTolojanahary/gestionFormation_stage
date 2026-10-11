// app/(tabs)/profile/index.tsx
//
// Écran Profil (route /(tabs)/profile)
// - affiche la photo, l'identité et les informations du compte
// - ouvre ProfileModal (components/profile/profile-modal.tsx) pour modifier
// - permet de se déconnecter
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Camera,
  LogOut,
  Mail,
  Phone,
  User as UserIcon,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { ProfileModal } from '@/components/profile/profile-modal';
import { ImageLightbox } from '@/components/image-lightbox';
import { DetailHeader } from '@/components/detail-header';
import { createProfileStyles } from '@/styles/profile.styles';
import { useSettings, useThemedStyles } from '@/context/SettingsContext';
import { getFileUrl, getInitiales } from '@/utils/format';

export default function ProfileScreen() {
  const styles = useThemedStyles(createProfileStyles);
  const { palette } = useSettings();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [modifOuverte, setModifOuverte] = useState(false);
  const [apercuPhoto, setApercuPhoto] = useState<string | null>(null);

  const photoUrl = user?.photo ? getFileUrl(user.photo) : null;
  const initiales = getInitiales(user?.prenom, user?.nom);

  function retour() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as any);
  }

  // Déconnexion puis retour à l'écran de connexion
  async function seDeconnecter() {
    await logout();
    router.replace('/login');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ─── En-tête ─── */}
      <DetailHeader
        title={`Profil de ${user?.prenom || ''}`}
        onBack={retour}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerSubtitle}>Vos informations personnelles</Text>

        {/* ─── Carte profil ─── */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarSection}
            activeOpacity={0.85}
            onPress={() => photoUrl && setApercuPhoto(photoUrl)}
          >
            <View style={styles.avatarCircle}>
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <Text style={styles.avatarText}>{initiales}</Text>
              )}
            </View>

            <View style={styles.editPhotoBadge}>
              <Camera size={16} color={palette.onAccent} />
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>
            {user?.prenom} {user?.nom}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>

          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.85}
            onPress={() => setModifOuverte(true)}
          >
            <Camera size={18} color={palette.onAccent} />
            <Text style={styles.editBtnText}>Modifier mon profil</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Informations du compte ─── */}
        <Text style={styles.sectionTitle}>Informations du compte</Text>

        <View style={styles.infoCard}>
          {/* Nom */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <UserIcon size={16} color={palette.accent} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Nom</Text>
              <Text style={styles.infoValue}>{user?.nom || '—'}</Text>
            </View>
          </View>

          {/* Prénom */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <UserIcon size={16} color={palette.accent} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Prénom</Text>
              <Text style={styles.infoValue}>{user?.prenom || '—'}</Text>
            </View>
          </View>

          {/* Email */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Mail size={16} color={palette.accent} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || '—'}</Text>
            </View>
          </View>

          {/* Téléphone */}
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIconWrap}>
              <Phone size={16} color={palette.accent} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{user?.telephone || '—'}</Text>
            </View>
          </View>
        </View>

        {/* ─── Déconnexion ─── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.85}
          onPress={seDeconnecter}
        >
          <LogOut size={18} color={palette.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Modale de modification ─── */}
      <ProfileModal
        visible={modifOuverte}
        onClose={() => setModifOuverte(false)}
      />
      <ImageLightbox
        src={apercuPhoto}
        onClose={() => setApercuPhoto(null)}
      />
    </SafeAreaView>
  );
}