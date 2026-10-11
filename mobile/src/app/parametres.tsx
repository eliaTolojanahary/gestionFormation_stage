// app/parametres.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Palette,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Check,
  Eye,
  EyeOff,
  LogOut,
  Smartphone,
  Monitor,
} from 'lucide-react-native';
import { DetailHeader } from '@/components/detail-header';
import {
  useParametre,
  COULEURS,
  type Theme,
  type FontSize,
  type Density,
} from '@/hooks/use-parametre';
import { createParametreStyles } from '@/styles/parametre.styles';
import { useThemedStyles } from '@/context/SettingsContext';
import { formatDate, shortUserAgent, shortOS } from '@/utils/format';

type Onglet = 'apparence' | 'securite';

// Écran Paramètres, deux onglets :
//  - Apparence : thème, couleur principale, taille du texte, densité (appliqués à toute l'app) ;
//  - Sécurité : changement de mot de passe, dernière connexion, sessions, déconnexion des autres appareils.
export default function ParametresScreen() {
  const router = useRouter();

  // Styles reconstruits à chaque changement d'apparence
  // (thème, couleur principale, taille du texte, densité)
  const styles = useThemedStyles(createParametreStyles);

  const {
    settings,
    changeSetting,
    saved,
    changePassword,
    isUpdatingPassword,
    passwordMessage,
    passwordError,
    sessions,
    lastLogin,
    isLoadingSessions,
    sessionsError,
    isLoggingOutAll,
    chargerSessions,
    logoutAll,
  } = useParametre();

  const [onglet, setOnglet] = useState<Onglet>('apparence');

  // Formulaire mot de passe
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);

  // Charge les sessions dès qu'on ouvre l'onglet sécurité
  useEffect(() => {
    if (onglet === 'securite') chargerSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onglet]);

  function retour() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  }

  // Vérifie la confirmation localement ; les autres contrôles sont faits par useParametre
  async function soumettrePassword() {
    if (newPass !== confirm) {
      Alert.alert('Erreur', 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    try {
      await changePassword(current, newPass);
      setCurrent(''); setNewPass(''); setConfirm('');
    } catch {
      // erreur exposée par le hook
    }
  }

  function confirmerLogoutAll() {
    Alert.alert(
      'Déconnexion globale',
      'Déconnecter toutes les autres sessions actives ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'destructive', onPress: logoutAll },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Même barre que les autres pages : retour + menu des options (ellipse) */}
      <DetailHeader title="Paramètres" onBack={retour} />

      {/* Onglets */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, onglet === 'apparence' && styles.tabActif]}
          onPress={() => setOnglet('apparence')}
        >
          <Palette size={16} color={onglet === 'apparence' ? '#FFFFFF' : '#5A6E85'} />
          <Text style={[styles.tabText, onglet === 'apparence' && styles.tabTextActif]}>
            Apparence
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, onglet === 'securite' && styles.tabActif]}
          onPress={() => setOnglet('securite')}
        >
          <SettingsIcon size={16} color={onglet === 'securite' ? '#FFFFFF' : '#5A6E85'} />
          <Text style={[styles.tabText, onglet === 'securite' && styles.tabTextActif]}>
            Sécurité
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══════════ APPARENCE ═══════════ */}
        {onglet === 'apparence' && (
          <>
            {/* Mode */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mode d'affichage</Text>
              <Text style={styles.cardSub}>Choisissez votre confort visuel.</Text>
              <View style={styles.modeRow}>
                {(['light', 'dark'] as Theme[]).map((mode) => {
                  const actif = settings.theme === mode;
                  const Icon = mode === 'light' ? Sun : Moon;
                  const label = mode === 'light' ? 'Clair' : 'Sombre';
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.modeBtn, actif && styles.modeBtnActif]}
                      onPress={() => changeSetting('theme', mode)}
                    >
                      <Icon size={16} color={actif ? '#FFFFFF' : '#5A6E85'} />
                      <Text style={[styles.modeBtnText, actif && styles.modeBtnTextActif]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Couleur */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Couleur principale</Text>
              <Text style={styles.cardSub}>Utilisée pour les éléments actifs.</Text>
              <View style={styles.couleursRow}>
                {COULEURS.map((c) => {
                  const actif = settings.color === c.value;
                  return (
                    <TouchableOpacity
                      key={c.value}
                      style={[styles.swatch, { backgroundColor: c.value }]}
                      onPress={() => changeSetting('color', c.value)}
                    >
                      {actif ? <Check size={18} color="#FFFFFF" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Taille du texte */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Taille du texte</Text>
              <View style={styles.modeRow}>
                {(['petite', 'normale', 'grande'] as FontSize[]).map((s) => {
                  const actif = settings.fontSize === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.modeBtn, actif && styles.modeBtnActif]}
                      onPress={() => changeSetting('fontSize', s)}
                    >
                      <Text style={[styles.modeBtnText, actif && styles.modeBtnTextActif]}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Densité */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Densité de l'interface</Text>
              <View style={styles.modeRow}>
                {(['compacte', 'confortable'] as Density[]).map((d) => {
                  const actif = settings.density === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.modeBtn, actif && styles.modeBtnActif]}
                      onPress={() => changeSetting('density', d)}
                    >
                      <Text style={[styles.modeBtnText, actif && styles.modeBtnTextActif]}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* ═══════════ SÉCURITÉ ═══════════ */}
        {onglet === 'securite' && (
          <>
            {/* Mot de passe */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Changement de mot de passe</Text>
              <Text style={styles.cardSub}>
                Modifiez régulièrement votre mot de passe.
              </Text>

              {passwordError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{passwordError}</Text>
                </View>
              ) : null}
              {passwordMessage ? (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>{passwordMessage}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>Mot de passe actuel</Text>
              <TextInput
                style={styles.input}
                value={current}
                onChangeText={setCurrent}
                secureTextEntry={!voirMdp}
                placeholder="••••••••"
                placeholderTextColor="#A0AAB8"
              />

              <Text style={styles.label}>Nouveau mot de passe</Text>
              <TextInput
                style={styles.input}
                value={newPass}
                onChangeText={setNewPass}
                secureTextEntry={!voirMdp}
                placeholder="Au moins 8 caractères"
                placeholderTextColor="#A0AAB8"
              />

              <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!voirMdp}
                placeholder="••••••••"
                placeholderTextColor="#A0AAB8"
              />

              <TouchableOpacity
                style={styles.voirMdpBtn}
                onPress={() => setVoirMdp((v) => !v)}
              >
                {voirMdp ? <EyeOff size={14} color="#5A6E85" /> : <Eye size={14} color="#5A6E85" />}
                <Text style={styles.voirMdpText}>
                  {voirMdp ? 'Masquer' : 'Afficher'} les mots de passe
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, isUpdatingPassword && styles.primaryBtnDisabled]}
                onPress={soumettrePassword}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Mettre à jour</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Dernière connexion */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Dernière connexion</Text>
              <Text style={styles.cardSub}>
                {isLoadingSessions
                  ? 'Chargement…'
                  : lastLogin
                  ? `${formatDate(lastLogin.cree_le)} • ${shortUserAgent(lastLogin.user_agent)} ${shortOS(lastLogin.user_agent)}`
                  : 'Aucune donnée'}
              </Text>
            </View>

            {/* Déconnexion globale */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Déconnexion globale</Text>
              <Text style={styles.cardSub}>
                Déconnectez votre compte de tous les appareils.
              </Text>
              <TouchableOpacity
                style={[styles.dangerBtn, isLoggingOutAll && styles.primaryBtnDisabled]}
                onPress={confirmerLogoutAll}
                disabled={isLoggingOutAll}
              >
                <LogOut size={16} color="#FFFFFF" />
                <Text style={styles.dangerBtnText}>
                  {isLoggingOutAll ? 'Déconnexion…' : 'Se déconnecter partout'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Historique des sessions */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Historique des connexions</Text>
              <Text style={styles.cardSub}>
                Dernières sessions ouvertes sur votre compte.
              </Text>

              {sessionsError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{sessionsError}</Text>
                </View>
              ) : null}

              {isLoadingSessions ? (
                <ActivityIndicator
                  size="small"
                  color="#072E4C"
                  style={{ marginTop: 12 }}
                />
              ) : sessions.length === 0 ? (
                <Text style={styles.emptyText}>Aucune session enregistrée.</Text>
              ) : (
                <View style={{ marginTop: 10 }}>
                  {sessions.map((s) => (
                    <View key={s.id_session} style={styles.sessionRow}>
                      <View style={styles.sessionIconWrap}>
                        {shortOS(s.user_agent) === 'iOS' ||
                        shortOS(s.user_agent) === 'Android' ? (
                          <Smartphone size={18} color="#0A3B66" />
                        ) : (
                          <Monitor size={18} color="#0A3B66" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sessionTitle}>
                          {shortUserAgent(s.user_agent)}
                          {shortOS(s.user_agent) ? ` · ${shortOS(s.user_agent)}` : ''}
                          {s.est_courante ? ' · Actuel' : ''}
                        </Text>
                        <Text style={styles.sessionMeta}>
                          {s.ip || 'IP inconnue'} · {formatDate(s.cree_le)}
                        </Text>
                      </View>
                      <View style={[styles.pill, s.actif ? styles.pillActif : styles.pillInactif]}>
                        <Text
                          style={[
                            styles.pillText,
                            s.actif ? styles.pillTextActif : styles.pillTextInactif,
                          ]}
                        >
                          {s.actif ? 'Actif' : 'Expiré'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {saved ? (
          <View style={styles.savedLabel}>
            <Check size={14} color="#2E7D32" />
            <Text style={styles.savedLabelText}>Modifications enregistrées !</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
