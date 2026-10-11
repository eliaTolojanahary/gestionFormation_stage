// components/profile/profile-modal.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, Image, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { X, Camera, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { getFileUrl } from '@/utils/format';
import { useAuth } from '@/context/AuthContext';
import { useProfil, type UpdateProfilPayload } from '@/hooks/use-profile';
import { useThemedStyles } from '@/context/SettingsContext';
import { ImageLightbox } from '@/components/image-lightbox';
import { createProfileModalStyles } from '@/styles/components/profile-modal.styles';

interface Props {
  visible: boolean;
  onClose: () => void;
  onUpdated?: (updated: any) => void;
}

// Fenêtre "Modifier mon profil" : nom, prénom, e-mail, téléphone et photo (galerie du téléphone).
// Même fonctionnement que la fenêtre profil du web.
export function ProfileModal({ visible, onClose, onUpdated }: Props) {
  const { user, updateCurrentUser } = useAuth();
  const {
    getProfil,
    updateProfil,
    isLoading: isUpdating,
    error: apiError,
  } = useProfil();

  const styles = useThemedStyles(createProfileModalStyles);

  // ─── État principal du profil ───
  // Comme dans le web : initialisé avec `user` puis rechargé depuis l'API
  const [profile, setProfile] = useState<any>(user || {});

  const [photoLocale, setPhotoLocale] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ─── Chargement du profil depuis le serveur ───
  // Équivalent web : getUser(userId).then(data => setProfile({...data, id_role: String(...)}))
  useEffect(() => {
    if (!visible) return;

    const userId = user?.id || user?.id_utilisateur;

    if (!userId) {
      setIsLoadingProfile(false);
      return;
    }

    let annule = false;

    (async () => {
      setIsLoadingProfile(true);
      try {
        const data = await getProfil();
        if (annule) return;

        setProfile({
          ...data,
          // 🔑 id_role conservé en string, comme dans le web
          id_role: String(data?.id_role ?? user?.id_role ?? ''),
        });
      } catch {
        // silencieux : on garde le `user` initial
        setProfile((current: any) => ({
          ...current,
          id_role: String(current?.id_role ?? user?.id_role ?? ''),
        }));
      } finally {
        if (!annule) setIsLoadingProfile(false);
      }
    })();

    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, user?.id]);

  // ─── Réinitialisation à chaque ouverture ───
  useEffect(() => {
    if (!visible) return;
    setPhotoLocale(null);
    setMessage('');
    setLocalError('');
     
  }, [visible]);

  // ─── Changement de champ ───
  function handleChange(name: string, value: string) {
    setProfile((current: any) => ({ ...current, [name]: value }));
  }

  // ─── Sélection de photo ───
  async function choisirPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission refusée',
        "L'accès à la galerie est nécessaire pour changer votre photo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoLocale(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
  setMessage('');
  setLocalError('');
  setEnvoiEnCours(true);

  try {
    const id = profile?.id || profile?.id_utilisateur || user?.id;

    // Champs simples : toujours en JSON (comme sur le web).
    const champs = {
      nom: profile?.nom || '',
      prenom: profile?.prenom || '',
      email: profile?.email || '',
      telephone: profile?.telephone || '',
      ...(profile?.id_role ? { id_role: String(profile.id_role) } : {}),
    };

    // Sans photo → objet simple (le hook le sérialise en JSON)
    let corps: UpdateProfilPayload | FormData = champs;

    if (photoLocale) {
      // Avec photo → multipart/form-data (le backend lit req.file)
      const formData = new FormData();

      Object.entries(champs).forEach(([cle, valeur]) => {
        formData.append(cle, valeur);
      });

      const nomFichier = photoLocale.split('/').pop()?.split('?')[0] || 'photo.jpg';

      if (Platform.OS === 'web') {
        // Sur le web, FormData attend un vrai File/Blob :
        // { uri, name, type } y serait converti en "[object Object]".
        const blob = await (await fetch(photoLocale)).blob();
        formData.append('photo', new File([blob], nomFichier, { type: blob.type || 'image/jpeg' }));
      } else {
        // Sur iOS / Android, l'objet { uri, name, type } est la bonne forme.
        formData.append('photo', {
          uri: photoLocale,
          name: nomFichier,
          type: 'image/jpeg',
        } as any);
      }

      corps = formData;
    }

    // 1️⃣ Envoyer la mise à jour
    await updateProfil(id!, corps);

    // 2️⃣ Recharger le profil frais depuis le serveur
    const profilFrais = await getProfil();

    // 3️⃣ Mettre à jour le contexte avec les données FRAÎCHES
    await updateCurrentUser({
      ...user,
      ...profilFrais,           // ✅ priorité aux données serveur
      id,
      // On force le rôle pour éviter la déconnexion
      role: user?.role || profilFrais?.role || user?.role_nom,
    });

    setMessage('Profil mis à jour avec succès.');

    // ⚠️ Petit délai pour laisser le temps au refresh
    setTimeout(() => {
      onUpdated?.(profilFrais);
      onClose();
    }, 1000);
  } catch (err: any) {
    console.error('>>> Erreur handleSubmit:', err);
    setLocalError(err?.message || 'Une erreur est survenue.');
  } finally {
    setEnvoiEnCours(false);
  }
}

  // Affiche l'erreur locale ou celle du hook
  const displayedError = localError || apiError;

  // URL affichée : photo locale prioritaire, sinon photo serveur
  const previewUrl = photoLocale
    ? photoLocale
    : profile?.photo
    ? getFileUrl(profile.photo)
    : null;

  function handlePhotoClick() {
    if (previewUrl) setPreviewImage(previewUrl);
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Profil utilisateur</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                disabled={envoiEnCours}
              >
                <X size={20} color="#0A2D4F" />
              </TouchableOpacity>
            </View>

            {isLoadingProfile ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#072E4C" />
                <Text style={{ marginTop: 12, color: '#8898AA' }}>
                  Chargement du profil...
                </Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Photo */}
                <TouchableOpacity
                  style={styles.photoWrapper}
                  onPress={handlePhotoClick}
                  activeOpacity={previewUrl ? 0.85 : 1}
                  disabled={!previewUrl}
                >
                  {previewUrl ? (
                    <Image source={{ uri: previewUrl }} style={styles.photo} />
                  ) : (
                    <View style={[styles.photo, styles.photoPlaceholder]}>
                      <Text style={styles.photoPlaceholderText}>
                        {profile?.prenom?.[0] || 'U'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoChangeBtn}
                  onPress={choisirPhoto}
                  disabled={envoiEnCours}
                >
                  <Camera size={14} color="#0A3B66" />
                  <Text style={styles.photoChangeText}>
                    {previewUrl ? 'Changer la photo' : 'Ajouter une photo'}
                  </Text>
                </TouchableOpacity>

                {/* Messages */}
                {displayedError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{displayedError}</Text>
                  </View>
                ) : null}
                {message ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>{message}</Text>
                  </View>
                ) : null}

                {/* Formulaire */}
                <Text style={styles.label}>Nom</Text>
                <TextInput
                  style={styles.input}
                  value={profile?.nom || ''}
                  onChangeText={(v) => handleChange('nom', v)}
                  placeholder="Votre nom"
                  placeholderTextColor="#A0AAB8"
                />

                <Text style={styles.label}>Prénom</Text>
                <TextInput
                  style={styles.input}
                  value={profile?.prenom || ''}
                  onChangeText={(v) => handleChange('prenom', v)}
                  placeholder="Votre prénom"
                  placeholderTextColor="#A0AAB8"
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={profile?.email || ''}
                  onChangeText={(v) => handleChange('email', v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="email@exemple.com"
                  placeholderTextColor="#A0AAB8"
                />

                <Text style={styles.label}>Téléphone</Text>
                <TextInput
                  style={styles.input}
                  value={profile?.telephone || ''}
                  onChangeText={(v) => handleChange('telephone', v)}
                  keyboardType="phone-pad"
                  placeholder="+261 34 00 000 00"
                  placeholderTextColor="#A0AAB8"
                />

                {/* id_role : champ caché, non affiché */}

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={onClose}
                    disabled={envoiEnCours}
                  >
                    <Text style={styles.secondaryBtnText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      envoiEnCours && styles.primaryBtnDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={envoiEnCours || isUpdating}
                  >
                    {envoiEnCours || isUpdating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={16} color="#FFFFFF" />
                        <Text style={styles.primaryBtnText}>Enregistrer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lightbox plein écran */}
      <ImageLightbox
        src={previewImage}
        alt="Photo de profil agrandie"
        onClose={() => setPreviewImage(null)}
      />
    </>
  );
}