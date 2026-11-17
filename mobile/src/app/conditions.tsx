// app/conditions.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldCheck, Check, X } from 'lucide-react-native';
import { DetailHeader } from '@/components/detail-header';
import { ConditionsTexte } from '@/components/conditions/conditions-texte';
import { useAuth } from '@/context/AuthContext';
import { useThemedStyles, useSettings } from '@/context/SettingsContext';
import { createConditionsStyles } from '@/styles/conditions.styles';
import { accepterConditions } from '@/utils/conditions';

// Conditions d'utilisation + Politique de confidentialité (présence, paiement, note, attestation).
// Étudiants seulement. Deux modes :
//  - accord (par défaut) : ouvert par les onglets tant que l'étudiant n'a pas accepté
//    la version actuelle ; « J'accepte » enregistre l'accord, « Je refuse » déconnecte ;
//  - lecture (?lecture=1) : depuis le menu « ⋮ », simple consultation avec un bouton retour.
export default function ConditionsScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createConditionsStyles);
  const { palette } = useSettings();
  const { user, logout } = useAuth();
  const params = useLocalSearchParams<{ lecture?: string }>();
  const lecture = params.lecture === '1';

  const [enCours, setEnCours] = useState(false);

  // En mode accord, le bouton retour Android ne permet pas de contourner le choix
  useEffect(() => {
    if (lecture) return;
    const abonnement = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => abonnement.remove();
  }, [lecture]);

  function retour() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  }

  async function accepter() {
    const id = user?.id ?? user?.id_utilisateur;
    if (id === undefined || id === null) {
      router.replace('/login' as any);
      return;
    }
    setEnCours(true);
    try {
      await accepterConditions(id);
      router.replace('/(tabs)' as any);
    } catch {
      Alert.alert('Erreur', "Impossible d'enregistrer votre accord. Réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  function refuser() {
    Alert.alert(
      'Refuser les conditions',
      "Sans votre accord, vous ne pouvez pas utiliser l'application. Vous allez être déconnecté.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Je refuse',
          style: 'destructive',
          onPress: async () => {
            setEnCours(true);
            await logout();
            setEnCours(false);
            router.replace('/login' as any);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={lecture ? ['top'] : ['top', 'bottom']}>
      {lecture ? (
        <DetailHeader title="Conditions" onBack={retour} recherche={false} />
      ) : (
        <View style={styles.entete}>
          <View style={styles.enteteIcone}>
            <ShieldCheck size={22} color={palette.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.enteteTitre}>Avant de commencer</Text>
            <Text style={styles.enteteSous}>Lisez et acceptez les conditions pour continuer.</Text>
          </View>
        </View>
      )}

      <ConditionsTexte />

      {!lecture && (
        <>
          <Text style={styles.actionsNote}>
            En acceptant, vous acceptez les Conditions d&apos;utilisation et la Politique de confidentialité.
          </Text>
          <View style={[styles.actions, { borderTopWidth: 0 }]}>
            <TouchableOpacity
              style={[styles.btn, styles.btnRefuser, enCours && styles.btnDisabled]}
              onPress={refuser}
              disabled={enCours}
              activeOpacity={0.8}
            >
              <X size={18} color={palette.danger} />
              <Text style={styles.btnRefuserText}>Je refuse</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnAccepter, enCours && styles.btnDisabled]}
              onPress={accepter}
              disabled={enCours}
              activeOpacity={0.8}
            >
              {enCours ? (
                <ActivityIndicator size="small" color={palette.onAccent} />
              ) : (
                <>
                  <Check size={18} color={palette.onAccent} />
                  <Text style={styles.btnAccepterText}>J&apos;accepte</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
