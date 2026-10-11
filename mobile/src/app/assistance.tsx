// app/assistance.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Send } from 'lucide-react-native';
import { DetailHeader } from '@/components/detail-header';
import { useAssistance, type DemandeAssistance } from '@/hooks/use-assistance';
import { createAssistanceStyles } from '@/styles/assistance.styles';
import { useSettings, useThemedStyles } from '@/context/SettingsContext';
import { formatDate } from '@/utils/format';

const LONGUEUR_MAX_OBJET = 150;

// Badge "En attente" / "Résolu"
function BadgeStatut({ demande, styles }: { demande: DemandeAssistance; styles: any }) {
  const resolu = demande.statut === 'Résolu';
  return (
    <View style={[styles.badge, resolu ? styles.badgeResolu : styles.badgeAttente]}>
      <Text style={[styles.badgeText, resolu ? styles.badgeTextResolu : styles.badgeTextAttente]}>
        {demande.statut}
      </Text>
    </View>
  );
}

// L'étudiant écrit à l'accueil ; l'accueil traite la demande sur le web
// et l'étudiant reçoit une notification quand elle est résolue.
export default function AssistanceScreen() {
  const styles = useThemedStyles(createAssistanceStyles);
  const { palette } = useSettings();
  const router = useRouter();
  const { demandes, isLoading, isSending, error, getDemandes, envoyerDemande } = useAssistance();

  const [objet, setObjet] = useState('');
  const [contenu, setContenu] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const peutEnvoyer = objet.trim().length > 0 && contenu.trim().length > 0 && !isSending;

  // Retour à l'écran précédent, ou à l'accueil s'il n'y en a pas
  function retour() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  }

  // En cas de succès : formulaire vidé et message de confirmation
  async function envoyer() {
    setEnvoye(false);
    if (await envoyerDemande(objet, contenu)) {
      setObjet('');
      setContenu('');
      setEnvoye(true);
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getDemandes();
    } finally {
      setRefreshing(false);
    }
  }, [getDemandes]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DetailHeader title="Assistance" onBack={retour} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.accent} />
          }
        >
          <Text style={styles.headerSubtitle}>
            Une question ou un problème ? Écrivez à l'accueil IMTECH. Vous serez notifié dès que votre demande sera résolue.
          </Text>

          {/* ─── Nouvelle demande ─── */}
          <View style={styles.formCard}>
            <Text style={styles.label}>Objet</Text>
            <TextInput
              style={styles.input}
              value={objet}
              onChangeText={setObjet}
              placeholder="Ex : Je ne vois pas mon support de cours"
              placeholderTextColor={palette.textMuted}
              maxLength={LONGUEUR_MAX_OBJET}
            />

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={contenu}
              onChangeText={setContenu}
              placeholder="Décrivez votre problème..."
              placeholderTextColor={palette.textMuted}
              multiline
            />

            <TouchableOpacity
              style={[styles.sendBtn, !peutEnvoyer && styles.sendBtnDisabled]}
              onPress={envoyer}
              disabled={!peutEnvoyer}
              activeOpacity={0.9}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={palette.onAccent} />
              ) : (
                <>
                  <Send size={18} color={palette.onAccent} />
                  <Text style={styles.sendBtnText}>Envoyer la demande</Text>
                </>
              )}
            </TouchableOpacity>

            {envoye ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>Votre demande a bien été envoyée à l'accueil.</Text>
              </View>
            ) : null}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          {/* ─── Mes demandes ─── */}
          <Text style={styles.sectionTitle}>Mes demandes</Text>

          {isLoading && demandes.length === 0 ? (
            <ActivityIndicator size="large" color={palette.accent} />
          ) : demandes.length === 0 ? (
            <Text style={styles.emptyText}>Vous n'avez encore envoyé aucune demande.</Text>
          ) : (
            demandes.map((d) => (
              <View key={d.id_assistance} style={styles.demandeCard}>
                <View style={styles.demandeHeader}>
                  <Text style={styles.demandeObjet}>{d.objet}</Text>
                  <BadgeStatut demande={d} styles={styles} />
                </View>
                <Text style={styles.demandeContenu}>{d.contenu}</Text>
                <Text style={styles.demandeDate}>
                  Envoyée le {formatDate(d.date_envoi)}
                  {d.date_resolution ? ` · Résolue le ${formatDate(d.date_resolution)}` : ''}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
