import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { createLoginStyles } from '@/styles/login.styles';
import { useThemedStyles } from '@/context/SettingsContext';

// Écran de connexion. Après succès, on remplace l'écran par les onglets
// (replace : le bouton retour ne ramène pas à la connexion).
// Seuls les rôles autorisés sur mobile peuvent se connecter (voir use-auth.ts).
export default function LoginScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createLoginStyles);
  const { login, isLoading, error } = useAuth();

  // E-mail pré-rempli après une inscription en ligne (vitrine)
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre email et mot de passe.');
      return;
    }

    // login(email, password, rememberMe)
    const user = await login(email, password, true);

    if (user) {
      router.replace('/(tabs)' as any);
    } else {
      Alert.alert('Erreur', error || 'Connexion refusée');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoCard}>
              <Image source={require('../../assets/logoImtech.png')} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.brandTitle}>IMTECH INFO</Text>
            <View style={styles.brandUnderline} />
            <Text style={styles.brandSubtitle}>PLATEFORME DE FORMATION</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connexion</Text>
            <Text style={styles.cardSubtitle}>Connectez-vous pour accéder à votre espace de formation.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse e-mail</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#8E9AA8" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="exemple@imtech.info"
                  placeholderTextColor="#A0AAB8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#8E9AA8" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#A0AAB8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  {showPassword ? <Eye size={18} color="#8E9AA8" /> : <EyeOff size={18} color="#8E9AA8" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Message d'erreur inline (plus discret que Alert) */}
            {error ? (
              <Text style={{ color: '#E53935', fontSize: 12.5, marginBottom: 12, textAlign: 'center' }}>
                {error}
              </Text>
            ) : null}

            {/* Pas encore de réinitialisation dans l'app : simple message d'aide */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => Alert.alert('Aide', 'Contactez le support IMTECH.')}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            {/* Personne non inscrite : vitrine des formations et inscription en ligne */}
            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => router.push('/decouvrir' as any)}
            >
              <Text style={styles.forgotText}>Pas encore inscrit ? Découvrir nos formations</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

